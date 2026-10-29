import { inject, Injectable, signal } from '@angular/core';
import { CoreResponseProductDto } from '../../../../../libs/api/src';
import { ProductsApiService } from '../api-services/products/products-api.service';

/**
 * Service to cache and manage products state across the application.
 * Provides a centralized way to access and refresh products data.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductsCacheService {
  /** Products API service instance. */
  private readonly _productsApiService = inject(ProductsApiService);

  /** Products signal containing the cached products list. */
  private readonly _products = signal<CoreResponseProductDto[]>([]);

  /** Public readonly signal to expose products. */
  readonly products = this._products.asReadonly();

  constructor() {
    this.refreshProducts();
  }

  /**
   * Refreshes the products cache by fetching the latest data from the API.
   */
  refreshProducts(): void {
    this._productsApiService.getAllProducts().subscribe({
      next: (products) => {
        this._products.set(products);
      },
      error: (error) => {
        console.error('Error refreshing products cache:', error);
      }
    });
  }
}