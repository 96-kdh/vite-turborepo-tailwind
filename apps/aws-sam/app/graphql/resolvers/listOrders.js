export function request(ctx) {
   const { nextToken, limit = 20 } = ctx.args;

   return {
      operation: "Scan",
      nextToken,
      limit,
   };
}

export function response(ctx) {
   const { items, nextToken } = ctx.result;
   return { items: items ?? [], nextToken };
}
