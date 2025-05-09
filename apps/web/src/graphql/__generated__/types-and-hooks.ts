import {
   InfiniteData,
   UseInfiniteQueryOptions,
   UseQueryOptions,
   useInfiniteQuery,
   useQuery,
} from "@tanstack/react-query";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };

function fetcher<TData, TVariables>(endpoint: string, requestInit: RequestInit, query: string, variables?: TVariables) {
   return async (): Promise<TData> => {
      const res = await fetch(endpoint, {
         method: "POST",
         ...requestInit,
         body: JSON.stringify({ query, variables }),
      });

      const json = await res.json();

      if (json.errors) {
         const { message } = json.errors[0];

         throw new Error(message);
      }

      return json.data;
   };
}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
   ID: { input: string; output: string };
   String: { input: string; output: string };
   Boolean: { input: boolean; output: boolean };
   Int: { input: number; output: number };
   Float: { input: number; output: number };
};

export type Order = {
   __typename?: "Order";
   block_number: Scalars["String"]["output"];
   created_at: Scalars["String"]["output"];
   deposit_amount: Scalars["String"]["output"];
   desired_amount: Scalars["String"]["output"];
   dst_chain_id: Scalars["Int"]["output"];
   maker: Scalars["String"]["output"];
   order_id: Scalars["ID"]["output"];
   src_chain_id: Scalars["Int"]["output"];
   status: Order_Status_Enum;
   taker: Scalars["String"]["output"];
   updated_at?: Maybe<Scalars["String"]["output"]>;
};

export type PaginatedOrders = {
   __typename?: "PaginatedOrders";
   items: Array<Order>;
   nextCursor?: Maybe<Scalars["String"]["output"]>;
};

export type Query = {
   __typename?: "Query";
   listOrders: PaginatedOrders;
};

export type QueryListOrdersArgs = {
   createdFrom?: InputMaybe<Scalars["String"]["input"]>;
   createdTo?: InputMaybe<Scalars["String"]["input"]>;
   cursor?: InputMaybe<Scalars["String"]["input"]>;
   depositMax?: InputMaybe<Scalars["String"]["input"]>;
   depositMin?: InputMaybe<Scalars["String"]["input"]>;
   desiredMax?: InputMaybe<Scalars["String"]["input"]>;
   desiredMin?: InputMaybe<Scalars["String"]["input"]>;
   dstChainId?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>>>;
   limit?: InputMaybe<Scalars["Int"]["input"]>;
   maker?: InputMaybe<Scalars["String"]["input"]>;
   srcChainId?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>>>;
   status?: InputMaybe<Array<InputMaybe<Order_Status_Enum>>>;
};

export enum Order_Status_Enum {
   Canceled = "canceled",
   CanceledLzReceive = "canceledLzReceive",
   Claim = "claim",
   ClaimLzReceive = "claimLzReceive",
   CreateOrder = "createOrder",
   CreateOrderLzReceive = "createOrderLzReceive",
   ExecuteOrder = "executeOrder",
   ExecuteOrderLzReceive = "executeOrderLzReceive",
   No = "no",
}

export type ListOrdersQueryVariables = Exact<{
   status?: InputMaybe<Array<InputMaybe<Order_Status_Enum>> | InputMaybe<Order_Status_Enum>>;
   srcChainId?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>> | InputMaybe<Scalars["Int"]["input"]>>;
   dstChainId?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>> | InputMaybe<Scalars["Int"]["input"]>>;
   maker?: InputMaybe<Scalars["String"]["input"]>;
   depositMin?: InputMaybe<Scalars["String"]["input"]>;
   depositMax?: InputMaybe<Scalars["String"]["input"]>;
   desiredMin?: InputMaybe<Scalars["String"]["input"]>;
   desiredMax?: InputMaybe<Scalars["String"]["input"]>;
   createdFrom?: InputMaybe<Scalars["String"]["input"]>;
   createdTo?: InputMaybe<Scalars["String"]["input"]>;
   limit?: InputMaybe<Scalars["Int"]["input"]>;
   cursor?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type ListOrdersQuery = {
   __typename?: "Query";
   listOrders: {
      __typename?: "PaginatedOrders";
      nextCursor?: string | null;
      items: Array<{
         __typename?: "Order";
         status: Order_Status_Enum;
         src_chain_id: number;
         dst_chain_id: number;
         order_id: string;
         deposit_amount: string;
         desired_amount: string;
         taker: string;
         maker: string;
         created_at: string;
         updated_at?: string | null;
         block_number: string;
      }>;
   };
};

export const ListOrdersDocument = `
    query ListOrders($status: [order_status_enum], $srcChainId: [Int], $dstChainId: [Int], $maker: String, $depositMin: String, $depositMax: String, $desiredMin: String, $desiredMax: String, $createdFrom: String, $createdTo: String, $limit: Int, $cursor: String) {
  listOrders(
    status: $status
    srcChainId: $srcChainId
    dstChainId: $dstChainId
    maker: $maker
    depositMin: $depositMin
    depositMax: $depositMax
    desiredMin: $desiredMin
    desiredMax: $desiredMax
    createdFrom: $createdFrom
    createdTo: $createdTo
    limit: $limit
    cursor: $cursor
  ) {
    items {
      status
      src_chain_id
      dst_chain_id
      order_id
      deposit_amount
      desired_amount
      taker
      maker
      created_at
      updated_at
      block_number
    }
    nextCursor
  }
}
    `;

export const useListOrdersQuery = <TData = ListOrdersQuery, TError = unknown>(
   dataSource: { endpoint: string; fetchParams?: RequestInit },
   variables?: ListOrdersQueryVariables,
   options?: Omit<UseQueryOptions<ListOrdersQuery, TError, TData>, "queryKey"> & {
      queryKey?: UseQueryOptions<ListOrdersQuery, TError, TData>["queryKey"];
   },
) => {
   return useQuery<ListOrdersQuery, TError, TData>({
      queryKey: variables === undefined ? ["ListOrders"] : ["ListOrders", variables],
      queryFn: fetcher<ListOrdersQuery, ListOrdersQueryVariables>(
         dataSource.endpoint,
         dataSource.fetchParams || {},
         ListOrdersDocument,
         variables,
      ),
      ...options,
   });
};

export const useInfiniteListOrdersQuery = <TData = InfiniteData<ListOrdersQuery>, TError = unknown>(
   dataSource: { endpoint: string; fetchParams?: RequestInit },
   variables: ListOrdersQueryVariables,
   options: Omit<UseInfiniteQueryOptions<ListOrdersQuery, TError, TData>, "queryKey"> & {
      queryKey?: UseInfiniteQueryOptions<ListOrdersQuery, TError, TData>["queryKey"];
   },
) => {
   return useInfiniteQuery<ListOrdersQuery, TError, TData>(
      (() => {
         const { queryKey: optionsQueryKey, ...restOptions } = options;
         return {
            queryKey:
               (optionsQueryKey ?? variables === undefined)
                  ? ["ListOrders.infinite"]
                  : ["ListOrders.infinite", variables],
            queryFn: (metaData) =>
               fetcher<ListOrdersQuery, ListOrdersQueryVariables>(
                  dataSource.endpoint,
                  dataSource.fetchParams || {},
                  ListOrdersDocument,
                  { ...variables, ...(metaData.pageParam ?? {}) },
               )(),
            ...restOptions,
         };
      })(),
   );
};
