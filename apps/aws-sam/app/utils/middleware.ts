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
      // value를 객체로 간주하여 각 키를 순회합니다.
      const newObj = {} as { [K in keyof T]: T[K] };
      for (const key in value) {
         if (Object.prototype.hasOwnProperty.call(value, key)) {
            // 여기서는 (value as any)[key]로 접근하는데, 이는 불가피하므로 캐스팅 처리합니다.
            newObj[key as keyof T] = recursivelyLowerCaseStrings((value as any)[key]);
         }
      }
      return newObj;
   }
   return value;
}

/**
 * 미들웨어: 커맨드 전송 전에 args.input의 모든 문자열 값을 소문자로 변환
 */
export const lowercaseMiddleware = (next: any, context: any) => async (args: any) => {
   args.input = recursivelyLowerCaseStrings(args.input);
   return next(args);
};
