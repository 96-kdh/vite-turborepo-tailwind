import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const eventWebHook = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
   try {
      if (typeof event.body === "string") {
         const body = JSON.parse(event.body);

         console.log(body.event.data);
      }

      console.log(process.env.NODE_ENV);

      return {
         statusCode: 200,
         headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
         },
         body: JSON.stringify({
            message: "ok",
         }),
      };
   } catch (err) {
      console.log(err);
      return {
         statusCode: 500,
         headers: {
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
         },
         body: JSON.stringify({
            message: "some error happened",
         }),
      };
   }
};
