import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app.services.product_link_service import ProductLinkReader

async def test():
    reader = ProductLinkReader()
    url = "https://www.trendyol.com/samsung/galaxy-a37-5g-8gb-256gb-antrasit-cep-telefonu-p-1129889926"
    print(f"Testing URL: {url}")
    try:
        result = reader.read(url)
        print("\n--- RESULTS ---")
        print(f"Title: {result.title}")
        print(f"Category: {result.category}")
        print(f"Price: {result.price} {result.currency}")
        print(f"Features Count: {len(result.features)}")
        print(f"Images Count: {len(result.images)}")
        
        print("\n--- FEATURES PREVIEW ---")
        for k, v in list(result.features.items())[:5]:
            print(f"  {k}: {v}")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
