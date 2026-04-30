declare module 'midtrans-client' {
  interface IMidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface ITransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface ICustomerDetails {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  }

  interface IItemDetail {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }

  interface IExpiryConfig {
    duration: number;
    unit: 'minute' | 'hour' | 'day';
  }

  interface ISnapTransactionParams {
    customer_details?: ICustomerDetails;
    expiry?: IExpiryConfig;
    item_details?: IItemDetail[];
    transaction_details: ITransactionDetails;
  }

  interface ISnapTransactionResponse {
    redirect_url: string;
    token: string;
  }

  class Snap {
    constructor(config: IMidtransConfig);
    createTransaction(params: ISnapTransactionParams): Promise<ISnapTransactionResponse>;
  }

  class CoreApi {
    constructor(config: IMidtransConfig);
    charge(params: Record<string, unknown>): Promise<Record<string, unknown>>;
  }
}
