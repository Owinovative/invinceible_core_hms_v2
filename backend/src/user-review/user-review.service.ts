import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UpsertUserReviewDto } from './dto/upsert-user-review.dto';

const MIN_REVIEW_LOGIN_COUNT = 5;

@Injectable()
export class UserReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private reviewInclude() {
    return {
      user: {
        include: {
          staff: true,
          role: true,
        },
      },
    };
  }

  private toPublicReview(review: any) {
    const staffName = review.user?.staff
      ? [review.user.staff.firstName, review.user.staff.lastName]
          .filter(Boolean)
          .join(' ')
      : '';
    const displayName =
      review.user?.fullName || staffName || review.user?.username || 'HMS user';

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewer: {
        username: review.user?.username,
        name: displayName,
        roleCode: review.user?.role?.code ?? null,
        photoUrl: review.user?.staff?.passportPhotoUrl ?? null,
        designation: review.user?.staff?.designation ?? null,
      },
    };
  }

  async findPublicReviews() {
    const reviews = await this.prisma.userReview.findMany({
      where: {
        isVisible: true,
      },
      include: this.reviewInclude(),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 80,
    });

    const aggregate = await this.prisma.userReview.aggregate({
      where: {
        isVisible: true,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return {
      summary: {
        averageRating: Number((aggregate._avg.rating ?? 0).toFixed(2)),
        reviewCount: aggregate._count.rating,
        minimumLoginCount: MIN_REVIEW_LOGIN_COUNT,
      },
      reviews: reviews.map((review) => this.toPublicReview(review)),
    };
  }

  async getMyReviewStatus(user: RequestUser) {
    const [loginCount, review] = await Promise.all([
      this.prisma.userSession.count({
        where: {
          userId: user.userId,
        },
      }),
      this.prisma.userReview.findUnique({
        where: {
          userId: user.userId,
        },
        include: this.reviewInclude(),
      }),
    ]);

    return {
      canReview: loginCount >= MIN_REVIEW_LOGIN_COUNT,
      loginCount,
      remainingLogins: Math.max(MIN_REVIEW_LOGIN_COUNT - loginCount, 0),
      minimumLoginCount: MIN_REVIEW_LOGIN_COUNT,
      review: review ? this.toPublicReview(review) : null,
    };
  }

  async upsertMyReview(user: RequestUser, dto: UpsertUserReviewDto) {
    const loginCount = await this.prisma.userSession.count({
      where: {
        userId: user.userId,
      },
    });

    if (loginCount < MIN_REVIEW_LOGIN_COUNT) {
      throw new BadRequestException(
        `You can review the system after ${MIN_REVIEW_LOGIN_COUNT} successful logins. You currently have ${loginCount}.`,
      );
    }

    const comment = dto.comment.trim();
    if (comment.length < 8) {
      throw new BadRequestException('Review comment is too short.');
    }

    const review = await this.prisma.userReview.upsert({
      where: {
        userId: user.userId,
      },
      update: {
        rating: dto.rating,
        comment,
        isVisible: true,
      },
      create: {
        userId: user.userId,
        rating: dto.rating,
        comment,
      },
      include: this.reviewInclude(),
    });

    return {
      message: 'Review saved successfully.',
      review: this.toPublicReview(review),
    };
  }
}
