/** What an operation asks the product to do. */
export enum OperationKind {
  CreateTenant = "CREATE_TENANT",
  UpdateTenant = "UPDATE_TENANT",
  DeleteTenant = "DELETE_TENANT",
  CreateUser = "CREATE_USER",
  UpdateUser = "UPDATE_USER",
  DeleteUser = "DELETE_USER",
}
