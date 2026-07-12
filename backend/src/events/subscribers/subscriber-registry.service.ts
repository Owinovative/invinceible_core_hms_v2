import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { CLINICAL_EVENT_SUBSCRIBER_KEY, type SubscribeOptions } from './subscribe.decorator';
import type { BaseClinicalEvent } from '../interfaces/base-clinical-event.interface';
import { EventRegistryService } from '../registry/event-registry.service';

export interface SubscriberHandler {
  instance: any;
  methodName: string;
  eventType: string;
  subscriberName: string; // Used for uniqueness in EventSubscriberStatus table
  options: SubscribeOptions;
  execute: (event: BaseClinicalEvent) => Promise<void>;
}

/**
 * Automatically discovers and registers all methods decorated with @SubscribeClinicalEvent.
 */
@Injectable()
export class SubscriberRegistry implements OnModuleInit {
  private readonly logger = new Logger(SubscriberRegistry.name);
  
  // Maps eventType -> list of handlers
  private readonly handlers = new Map<string, SubscriberHandler[]>();

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly eventRegistry: EventRegistryService,
  ) {}

  onModuleInit() {
    this.discoverSubscribers();
  }

  private discoverSubscribers() {
    const providers = this.discoveryService.getProviders();

    providers
      .filter((wrapper) => wrapper.isDependencyTreeStatic() && wrapper.instance)
      .forEach((wrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance);

        this.metadataScanner.getAllMethodNames(prototype).forEach((methodName) => {
          const method = instance[methodName];
          const metadata = this.reflector.get<{ eventType: string; options: SubscribeOptions }>(
            CLINICAL_EVENT_SUBSCRIBER_KEY,
            method,
          );

          if (metadata) {
            this.registerSubscriber(instance, methodName, method, metadata);
          }
        });
      });
  }

  private registerSubscriber(
    instance: any,
    methodName: string,
    method: Function,
    metadata: { eventType: string; options: SubscribeOptions },
  ) {
    const { eventType, options } = metadata;
    
    // Ensure the event type actually exists in the registry
    if (!this.eventRegistry.isRegistered(eventType)) {
      throw new Error(`SubscriberRegistry: Cannot subscribe to unknown event type "${eventType}" in ${instance.constructor.name}.${methodName}`);
    }

    const subscriberName = `${instance.constructor.name}.${methodName}`;
    
    // Default version to current registry version if not specified
    if (!options.version) {
      options.version = this.eventRegistry.getCurrentVersion(eventType);
    }
    
    // Default isolation to NORMAL
    if (!options.isolationLevel) {
      options.isolationLevel = 'NORMAL';
    }

    const handler: SubscriberHandler = {
      instance,
      methodName,
      eventType,
      subscriberName,
      options,
      execute: async (event: BaseClinicalEvent) => {
        // Ensure execution binds 'this' correctly to the instance
        await method.apply(instance, [event]);
      },
    };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    this.handlers.get(eventType)!.push(handler);
    
    this.logger.log(`Registered subscriber [${options.isolationLevel}]: ${subscriberName} -> ${eventType} (v${options.version})`);
  }

  /**
   * Get all registered subscribers for a specific event type.
   */
  getSubscribersForEvent(eventType: string): SubscriberHandler[] {
    return this.handlers.get(eventType) || [];
  }
}
