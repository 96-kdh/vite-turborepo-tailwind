interface AppSyncEvent {
   typeName: string;
   fieldName: string;
}

interface User {
   id: string;
   name: string;
   age?: number;
}

// 데모용 in-memory 사용자 데이터 저장소
const users: User[] = [
   { id: "1", name: "Alice", age: 30 },
   { id: "2", name: "Bob", age: 25 },
];

// sam local invoke GraphQLFunction --event events/graphql.json
export const handler = async (event: AppSyncEvent): Promise<string | User | User[] | null> => {
   console.log("Received event:", JSON.stringify(event, null, 2));

   const { typeName, fieldName } = event;

   if (typeName === "Query") {
      switch (fieldName) {
         case "hello":
            return "Hello from Lambda via AppSync with TypeScript!";
         case "getUser": {
            // id로 사용자 조회
            return users[0];
         }
         case "listUsers":
            return users;
         default:
            return null;
      }
   } else if (typeName === "Mutation") {
      console.log("Mutation");
      return null;
      //
   }

   return null;
};
