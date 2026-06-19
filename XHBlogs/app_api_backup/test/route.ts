export const runtime = 'edge';
export const dynamic = "force-static";
export async function GET() {
  return new Response("喵！我能通！", { status: 200 });
}