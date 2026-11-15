"""Passwort-Hashing mit scrypt oder PBKDF2-HMAC-SHA256."""
import hashlib
import hmac
import secrets

_N, _R, _P = 2**14, 8, 1
_PBKDF2_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_bytes = password.encode()
    if hasattr(hashlib, "scrypt"):
        digest = hashlib.scrypt(password_bytes, salt=salt, n=_N, r=_R, p=_P)
        return f"scrypt${_N}${_R}${_P}${salt.hex()}${digest.hex()}"

    digest = hashlib.pbkdf2_hmac("sha256", password_bytes, salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    fields = stored.split("$")
    scheme = fields[0]
    password_bytes = password.encode()

    if scheme == "scrypt":
        _, n, r, p, salt, digest = fields
        check = hashlib.scrypt(
            password_bytes, salt=bytes.fromhex(salt),
            n=int(n), r=int(r), p=int(p),
        )
    elif scheme == "pbkdf2_sha256":
        _, iterations, salt, digest = fields
        check = hashlib.pbkdf2_hmac(
            "sha256", password_bytes, bytes.fromhex(salt), int(iterations),
        )
    else:
        raise ValueError("Unsupported password hash scheme")

    return hmac.compare_digest(check.hex(), digest)


# Dummy-Hash, damit eine Anmeldung mit unbekannter E-Mail genauso lange dauert
# wie mit bekannter (verhindert, dass man registrierte Adressen erraten kann).
DUMMY_HASH = hash_password("dummy-password-0")
