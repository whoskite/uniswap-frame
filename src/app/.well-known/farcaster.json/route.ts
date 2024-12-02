export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_URL;

  const config = {
    accountAssociation: {
      header:
        "eyJmaWQiOjM2MjEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyY2Q4NWEwOTMyNjFmNTkyNzA4MDRBNkVBNjk3Q2VBNENlQkVjYWZFIn0",
      payload: "eyJkb21haW4iOiJmcmFtZXMtdjItc3dhcC1kZW1vLnZlcmNlbC5hcHAifQ",
      signature:
        "MHgxMzE0NDBjODMyMWRkM2UzNmQ3OWFiNDYxYmNiZThiOTM0NGNkOGZkNmVhMmVlNmY3YTY4NWJiNjMzMTYyNGNjNTczNjUyNTlhNzE5MTJkZDM4NWVmZmM5MWMwZmY1ZWVlMzYwNGUzYWNiZTI3MTQzYzIwYTRjMDBlNjgwZjBmNzFj",
    },
    frame: {
      version: "0.0.0",
      name: "Simple Swap Demo",
      iconUrl: `${appUrl}/icon.png`,
      splashImageUrl: `${appUrl}/splash.png`,
      splashBackgroundColor: "#f7f7f7",
      homeUrl: appUrl,
    },
  };

  return Response.json(config);
}
