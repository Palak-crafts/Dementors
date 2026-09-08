class CategoryMapper:
    """Custom wrapper for consistent categorical encoding."""

    def __init__(self, mapping: dict):
        self.mapping = mapping
        self.inverse = {v: k for k, v in mapping.items()}
        self.classes_ = list(mapping.keys())

    def transform(self, values):
        return [self.mapping[v] for v in values]

    def inverse_transform(self, values):
        return [self.inverse[v] for v in values]