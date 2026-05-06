import { BadRequestException } from '@nestjs/common';

export type PaginationQuery = {
  page?: string | number;
  pageSize?: string | number;
  search?: string;
  sortBy?: string;
  sortDirection?: string;
  cursor?: string;
};

export type PaginationOptions = {
  defaultPageSize?: number;
  maxPageSize?: number;
  allowedSortFields?: string[];
  defaultSortBy?: string;
  defaultSortDirection?: 'asc' | 'desc';
};

export function parsePagination(
  query: PaginationQuery,
  options: PaginationOptions = {},
) {
  const maxPageSize = options.maxPageSize ?? 100;
  const defaultPageSize = options.defaultPageSize ?? 25;
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number(query.pageSize ?? defaultPageSize) || defaultPageSize),
  );
  const sortBy = String(query.sortBy || options.defaultSortBy || 'createdAt');
  const sortDirection =
    String(query.sortDirection || options.defaultSortDirection || 'desc')
      .toLowerCase()
      .trim() === 'asc'
      ? 'asc'
      : 'desc';

  if (
    options.allowedSortFields?.length &&
    !options.allowedSortFields.includes(sortBy)
  ) {
    throw new BadRequestException(`Unsupported sort field: ${sortBy}`);
  }

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
    search: query.search?.trim() || undefined,
    sortBy,
    sortDirection: sortDirection,
    cursor: query.cursor,
  };
}

export function paginatedResponse<T>(
  data: T[],
  params: { page: number; pageSize: number; total: number },
) {
  const totalPages = Math.max(1, Math.ceil(params.total / params.pageSize));

  return {
    data,
    meta: {
      page: params.page,
      pageSize: params.pageSize,
      total: params.total,
      totalPages,
      hasNextPage: params.page < totalPages,
    },
  };
}
