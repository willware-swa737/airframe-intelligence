export interface FAARegistryResult {
  nNumber: string;
  make: string;
  model: string;
  year: number | null;
  serialNumber: string;
  status: string;
  statusDescription: string;
  registrationExpired: boolean;
  expirationDate: string | null;
  registrantName: string;
  registrantStreet: string;
  registrantCity: string;
  registrantState: string;
  registrantZip: string;
  engineMake: string;
  engineModel: string;
  aircraftType: string;
  category: string;
}

export async function lookupFAARegistry(nNumber: string): Promise<FAARegistryResult | null> {
  const clean = nNumber.toUpperCase().replace(/^N/, "");
  const url = `https://registry.faa.gov/AircraftInquiry/Search/AircraftDetails?NNumberTxt=${clean}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AirframeIntelligence/1.0" },
      next: { revalidate: 86400 }, // cache 24hrs
    });
    const html = await res.text();
    return parseFAAHtml(html, `N${clean}`);
  } catch {
    return null;
  }
}

function extractField(html: string, label: string): string {
  const patterns = [
    new RegExp(`${label}[^<]*</th>\\s*<td[^>]*>([^<]+)`, "i"),
    new RegExp(`${label}[^<]*</td>\\s*<td[^>]*>([^<]+)`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1].trim();
  }
  return "";
}

function parseFAAHtml(html: string, nNumber: string): FAARegistryResult | null {
  if (html.includes("No aircraft found") || html.includes("not found")) return null;

  const makeModel = extractField(html, "Aircraft Mfr Model Code");
  const parts = makeModel.split(/\s+/);

  return {
    nNumber,
    make: extractField(html, "Manufacturer Name") || parts[0] || "",
    model: extractField(html, "Model") || parts.slice(1).join(" ") || "",
    year: parseInt(extractField(html, "Year Mfr")) || null,
    serialNumber: extractField(html, "Serial Number"),
    status: extractField(html, "Status Code"),
    statusDescription: extractField(html, "Certificate Issue Date") ? "Valid" : "Unknown",
    registrationExpired: html.includes("Expired"),
    expirationDate: extractField(html, "Expiration Date") || null,
    registrantName: extractField(html, "Name"),
    registrantStreet: extractField(html, "Street"),
    registrantCity: extractField(html, "City"),
    registrantState: extractField(html, "State"),
    registrantZip: extractField(html, "Zip Code"),
    engineMake: extractField(html, "Engine Mfr"),
    engineModel: extractField(html, "Engine Model"),
    aircraftType: extractField(html, "Aircraft Type"),
    category: extractField(html, "Aircraft Category"),
  };
}
