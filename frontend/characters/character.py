from dataclasses import dataclass


@dataclass(frozen=True)
class Character:
    id: str
    name: str
    universe: str
    is_free: bool = False