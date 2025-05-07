export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Order = {
  __typename?: 'Order';
  block_number: Scalars['String']['output'];
  created_at: Scalars['String']['output'];
  deposit_amount: Scalars['String']['output'];
  desired_amount: Scalars['String']['output'];
  dst_chain_id: Scalars['Int']['output'];
  maker: Scalars['String']['output'];
  order_id: Scalars['ID']['output'];
  src_chain_id: Scalars['Int']['output'];
  status: Order_Status_Enum;
  taker?: Maybe<Scalars['String']['output']>;
  updated_at: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  listOrders: Array<Order>;
};


export type QueryListOrdersArgs = {
  createdFrom?: InputMaybe<Scalars['String']['input']>;
  createdTo?: InputMaybe<Scalars['String']['input']>;
  depositMax?: InputMaybe<Scalars['String']['input']>;
  depositMin?: InputMaybe<Scalars['String']['input']>;
  desiredMax?: InputMaybe<Scalars['String']['input']>;
  desiredMin?: InputMaybe<Scalars['String']['input']>;
  dstChainId?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  srcChainId?: InputMaybe<Scalars['Int']['input']>;
  status?: InputMaybe<Order_Status_Enum>;
};

export enum Order_Status_Enum {
  Canceled = 'canceled',
  CanceledLzReceive = 'canceledLzReceive',
  Claim = 'claim',
  ClaimLzReceive = 'claimLzReceive',
  CreateOrder = 'createOrder',
  CreateOrderLzReceive = 'createOrderLzReceive',
  ExecuteOrder = 'executeOrder',
  ExecuteOrderLzReceive = 'executeOrderLzReceive',
  No = 'no'
}


