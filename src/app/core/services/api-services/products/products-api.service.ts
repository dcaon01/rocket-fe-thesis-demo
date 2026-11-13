import { inject, Injectable } from '@angular/core';
import { CoreCreateProductDto, CoreProductsService, CoreResponseProductDto, CoreResponseProductsPageDto, CoreUpdateProductDto } from '../../../../../../libs/api/src/lib/rocket-core';
import { PageRequest } from '../../../interfaces/page.interface';
import { Observable } from 'rxjs';

/**
 * Service for managing product-related API calls.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductsApiService {
  /** Core products service instance. */
  private readonly _coreProductsService = inject(CoreProductsService);

  /**
   * Fetches all products in Rocket.
   * @returns all the products in Rocket.
   */
  getAllProducts(): Observable<CoreResponseProductDto[]> {
    return this._coreProductsService.productsControllerGetAllProducts({});
  }

  /**
   * Lists one page of the products, for the products page.
   * @param page the page to read.
   * @returns the page of products.
   */
  listProducts(page: PageRequest): Observable<CoreResponseProductsPageDto> {
    return this._coreProductsService.productsControllerListProducts({ body: page });
  }

  /**
   * Updates a product by its id.
   * @param id the identifier of the product.
   * @returns the product with the specified id.
   */
  getProduct(id: string): Observable<CoreResponseProductDto> {
    return this._coreProductsService.productsControllerGetProduct({ id });
  }

  /**
   * Creates a new product.
   * @param product the product data to create.
   * @returns an observable of the created product response.
   */
  createProduct(product: CoreCreateProductDto): Observable<CoreResponseProductDto> {
    return this._coreProductsService.productsControllerCreateProduct({ body: product });
  }

  /**
   * Updates an existing product.
   * @param id the identifier of the product.
   * @param product the information to update the product with.
   * @return an observable of the updated product response.
   */
  updateProduct(id: string, product: CoreUpdateProductDto): Observable<CoreResponseProductDto> {
    return this._coreProductsService.productsControllerUpdateProduct({ id, body: product });
  }

  /**
   * Deletes a product by its id.
   * @param id the identifier of the product.
   */
  deleteProduct(id: string): Observable<void> {
    return this._coreProductsService.productsControllerDeleteProduct({ id });
  }
}