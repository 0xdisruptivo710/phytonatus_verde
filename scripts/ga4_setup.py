"""
GA4 — registra Dimensões personalizadas + Eventos-chave (conversões) para o
tagueamento de ações do site Phytonatus.

Idempotente: pula o que já existe. Usa a conta de serviço (admin) — a chave
NUNCA é impressa.

Uso:
    uv run --with google-analytics-admin python scripts/ga4_setup.py

Credencial: ~/.secrets/ga4-phytonatus.json (ou env GOOGLE_APPLICATION_CREDENTIALS).
"""
import os

from google.analytics.admin import AnalyticsAdminServiceClient
from google.analytics import admin_v1alpha as admin
from google.oauth2 import service_account

PROPERTY = "properties/543515693"

# Dimensões personalizadas (escopo de evento): parameter_name = nome do
# parâmetro disparado pelo analytics.js.
DIMENSIONS = [
    ("page_name", "Página"),
    ("posicao", "Posição do botão"),
    ("loja", "Loja Marketplace"),
    ("setor", "Setor do lead"),
    ("marca", "Marca"),
    ("rede", "Rede social"),
    ("cta", "CTA"),
    ("utm_source", "UTM Source"),
    ("utm_medium", "UTM Medium"),
    ("utm_campaign", "UTM Campaign"),
]

# Eventos-chave (conversões).
KEY_EVENTS = ["generate_lead", "download_catalogo", "click_whatsapp"]


def get_client():
    key = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or os.path.expanduser(
        "~/.secrets/ga4-phytonatus.json"
    )
    creds = service_account.Credentials.from_service_account_file(key)
    return AnalyticsAdminServiceClient(credentials=creds)


def ensure_dimensions(client):
    existing = {d.parameter_name for d in client.list_custom_dimensions(parent=PROPERTY)}
    for param, label in DIMENSIONS:
        if param in existing:
            print(f"  dim  ok (existe)   {param}")
            continue
        client.create_custom_dimension(
            parent=PROPERTY,
            custom_dimension=admin.CustomDimension(
                parameter_name=param,
                display_name=label,
                scope=admin.CustomDimension.DimensionScope.EVENT,
            ),
        )
        print(f"  dim  CRIADA         {param}  ({label})")


def ensure_key_events(client):
    # API nova = key_events; fallback p/ conversion_events em libs antigas.
    try:
        existing = {k.event_name for k in client.list_key_events(parent=PROPERTY)}
        for name in KEY_EVENTS:
            if name in existing:
                print(f"  key  ok (existe)   {name}")
                continue
            client.create_key_event(
                parent=PROPERTY,
                key_event=admin.KeyEvent(
                    event_name=name,
                    counting_method=admin.KeyEvent.CountingMethod.ONCE_PER_EVENT,
                ),
            )
            print(f"  key  CRIADO         {name}")
    except AttributeError:
        existing = {c.event_name for c in client.list_conversion_events(parent=PROPERTY)}
        for name in KEY_EVENTS:
            if name in existing:
                print(f"  conv ok (existe)   {name}")
                continue
            client.create_conversion_event(
                parent=PROPERTY,
                conversion_event=admin.ConversionEvent(event_name=name),
            )
            print(f"  conv CRIADO         {name}")


def main():
    client = get_client()
    print("== Dimensões personalizadas ==")
    ensure_dimensions(client)
    print("== Eventos-chave (conversões) ==")
    ensure_key_events(client)
    print("OK — GA4 configurado.")


if __name__ == "__main__":
    main()
