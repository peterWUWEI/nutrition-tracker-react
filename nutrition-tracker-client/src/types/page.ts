// A page of results from a paginated API endpoint.
export interface Page<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}
