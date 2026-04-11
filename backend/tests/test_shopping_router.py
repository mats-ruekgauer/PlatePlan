import unittest

from app.routers.shopping import _normalise_category


class ShoppingRouterTests(unittest.TestCase):
    def test_normalise_category_maps_expected_values(self) -> None:
        self.assertEqual(_normalise_category("fruit"), "Produce")
        self.assertEqual(_normalise_category("seafood"), "Meat & Fish")
        self.assertEqual(_normalise_category("milk"), "Dairy")
        self.assertEqual(_normalise_category("spice"), "Pantry")
        self.assertEqual(_normalise_category("unknown"), "Other")


if __name__ == "__main__":
    unittest.main()
