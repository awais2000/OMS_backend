import "express-session";

declare module "express-session" {
    interface SessionData {
        cart: { description: string; QTY: number; UnitPrice: number }[];
    }
}
