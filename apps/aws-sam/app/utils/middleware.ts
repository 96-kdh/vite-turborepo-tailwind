/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 재귀적으로 객체 내 모든 문자열 값을 toLowerCase() 처리하는 함수
 */
function recursivelyLowerCaseStrings<T>(value: T): T {
   if (typeof value === "string") {
      return value.toLowerCase() as unknown as T;
   }
   if (Array.isArray(value)) {
      return value.map((item) => recursivelyLowerCaseStrings(item)) as unknown as T;
   }
   if (value !== null && typeof value === "object") {
      const newObj: any = {};
      for (const key in value) {
         if (Object.prototype.hasOwnProperty.call(value, key)) {
            newObj[key] = recursivelyLowerCaseStrings((value as any)[key]);
         }
      }
      return newObj;
   }
   return value;
}

/**
 * DynamoDB 입력 객체에서 실제 데이터 값이 저장되는 필드들만 선택적으로 소문자로 변환하는 함수.
 */
function transformDynamoDBInput(input: any): any {
   const output = { ...input };

   // Item 필드: PutCommand, UpdateCommand 등에서 데이터를 담는 부분
   if (output.Item) {
      output.Item = recursivelyLowerCaseStrings(output.Item);
   }

   // RequestItems: BatchWriteCommand에서 사용. 각 테이블에 대한 PutRequest의 Item 값 변환
   if (output.RequestItems) {
      for (const tableName in output.RequestItems) {
         if (Array.isArray(output.RequestItems[tableName])) {
            output.RequestItems[tableName] = output.RequestItems[tableName].map((entry: any) => {
               if (entry.PutRequest && entry.PutRequest.Item) {
                  entry.PutRequest.Item = recursivelyLowerCaseStrings(entry.PutRequest.Item);
               }
               return entry;
            });
         }
      }
   }

   // ExpressionAttributeValues: UpdateCommand 등에서 데이터 값으로 사용되는 부분
   if (output.ExpressionAttributeValues) {
      const newEAV: any = {};
      for (const key in output.ExpressionAttributeValues) {
         const val = output.ExpressionAttributeValues[key];
         // 만약 값이 문자열이면 소문자로 변환, 아니라면 재귀적으로 처리
         if (typeof val === "string") {
            newEAV[key] = val.toLowerCase();
         } else {
            newEAV[key] = recursivelyLowerCaseStrings(val);
         }
      }
      output.ExpressionAttributeValues = newEAV;
   }

   // 그 외 데이터로 취급되는 다른 필드가 있다면 여기에 추가할 수 있습니다.

   return output;
}

/**
 * 미들웨어: DynamoDB 커맨드 전송 전에, 입력 객체 중 실제 데이터가 담긴 부분만 소문자로 변환
 */
export const lowercaseMiddleware = (next: any, context: any) => async (args: any) => {
   args.input = transformDynamoDBInput(args.input);
   return next(args);
};
