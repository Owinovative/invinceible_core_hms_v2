"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function CreateInvoicePage() {
  // 1. State Management
  const [patientId, setPatientId] = useState("");
  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0 }
  ]);

  // 2. Logic Helpers
  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = items.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      patientId: Number(patientId),
      items: items
    };
    console.log("Submitting to NestJS:", payload);
    // Future step: Add your API mutation here
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection Card */}
        <Card className="rounded-[1.8rem] border border-white/10 bg-card/[0.02] shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Patient Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-2 block text-muted-foreground">Patient ID</label>
              <Input 
                placeholder="Ex: 101"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="rounded-xl h-12 bg-card/[0.03]"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card className="rounded-[1.8rem] border border-white/10 bg-card/[0.02] shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Billable Items</CardTitle>
            <Button 
              type="button" 
              onClick={addItem} 
              variant="outline" 
              className="rounded-xl gap-2 border-emerald-500/20 hover:bg-success/10"
            >
              <Plus className="h-4 w-4" /> Add Line
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-white/5 pb-6">
                <div className="md:col-span-6">
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <Input 
                    placeholder="E.g., Consultation Fee"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="rounded-lg bg-card/[0.03]"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                  <Input 
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    className="rounded-lg bg-card/[0.03]"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground mb-1 block">Price (KES)</label>
                  <Input 
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                    className="rounded-lg bg-card/[0.03]"
                  />
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Total Display */}
            <div className="pt-4 flex justify-end">
              <div className="text-right p-4 rounded-2xl bg-success/5 border border-emerald-500/10">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Total Balance</p>
                <p className="text-3xl font-bold text-emerald-400">
                  KES {calculateTotal().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/billing">
            <Button type="button" variant="ghost" className="rounded-xl h-12 px-6">
              Discard
            </Button>
          </Link>
          <Button 
            type="submit" 
            className="rounded-xl h-12 px-8 gap-2 bg-success hover:bg-emerald-700 text-white"
          >
            <Save className="h-5 w-5" /> Save Invoice
          </Button>
        </div>
      </form>
    </div>
  );
}