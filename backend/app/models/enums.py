import enum

class MembershipRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"