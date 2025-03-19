import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const eventWebHook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   try {
      console.log(event);

      return {
         statusCode: 200,
         body: JSON.stringify({
            message: "hello world aws-sam",
         }),
      };
   } catch (err) {
      console.log(err);
      return {
         statusCode: 500,
         body: JSON.stringify({
            message: "some error happened",
         }),
      };
   }
};
