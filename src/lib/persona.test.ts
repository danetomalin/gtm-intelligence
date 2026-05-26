import { describe, it, expect } from "vitest";
import {
  titleToRole,
  WORKSPACE_ROLES,
  ROLE_LABEL,
  ROLE_LABEL_SHORT,
  ROLE_TAGLINE,
  isValidRole,
  filterWorkflowsForLens,
  outputsForLens,
  LENS_OPTIONS,
  LENS_LABEL,
  groupWorkflowsByLayer,
  layerForCode,
  LAYER_ORDER,
  type Role,
} from "./persona";

describe("titleToRole", () => {
  it("classifies product marketing titles as marketing", () => {
    expect(titleToRole("VP Product Marketing")).toBe("marketing");
    expect(titleToRole("Senior PMM")).toBe("marketing");
    expect(titleToRole("Director, Product Marketing")).toBe("marketing");
    expect(titleToRole("product marketing manager")).toBe("marketing");
  });

  it("classifies general marketing titles as marketing", () => {
    expect(titleToRole("VP Marketing")).toBe("marketing");
    expect(titleToRole("Head of Demand Gen")).toBe("marketing");
    expect(titleToRole("Content Marketing Lead")).toBe("marketing");
    expect(titleToRole("Growth Marketer")).toBe("marketing");
  });

  it("classifies sales titles as sales", () => {
    expect(titleToRole("VP Sales")).toBe("sales");
    expect(titleToRole("Account Executive")).toBe("sales");
    expect(titleToRole("AE")).toBe("sales");
    expect(titleToRole("Senior BDR")).toBe("sales");
    expect(titleToRole("Sales Engineer")).toBe("sales");
    expect(titleToRole("RevOps Manager")).toBe("sales");
  });

  it("classifies customer-success titles as customer_success", () => {
    expect(titleToRole("VP Customer Success")).toBe("customer_success");
    expect(titleToRole("CSM")).toBe("customer_success");
    expect(titleToRole("Sr. Customer Success Manager")).toBe("customer_success");
    expect(titleToRole("CS Lead")).toBe("customer_success");
    expect(titleToRole("Director, Customer Experience")).toBe("customer_success");
  });

  it("classifies product titles as product", () => {
    expect(titleToRole("VP Product")).toBe("product");
    expect(titleToRole("Senior Product Manager")).toBe("product");
    expect(titleToRole("PM")).toBe("product");
  });

  it("PMM does not match the broader PM pattern", () => {
    // PMM should always be marketing, not product, despite both containing "pm".
    expect(titleToRole("PMM")).toBe("marketing");
    expect(titleToRole("Senior PMM")).toBe("marketing");
  });

  it("classifies executive titles as admin", () => {
    expect(titleToRole("CEO")).toBe("admin");
    expect(titleToRole("Founder")).toBe("admin");
    expect(titleToRole("Chief Marketing Officer")).toBe("marketing"); // marketing wins over chief
  });

  it("returns null for unknown or empty titles", () => {
    expect(titleToRole("")).toBeNull();
    expect(titleToRole(null)).toBeNull();
    expect(titleToRole(undefined)).toBeNull();
    expect(titleToRole("Astronaut")).toBeNull();
  });
});

describe("WORKSPACE_ROLES", () => {
  it("contains exactly the four customer-facing roles", () => {
    expect(WORKSPACE_ROLES).toEqual([
      "marketing",
      "sales",
      "product",
      "customer_success",
    ]);
  });

  it("does not include admin (admins use the marketing workspace by default)", () => {
    expect(WORKSPACE_ROLES).not.toContain("admin");
  });
});

describe("ROLE_LABEL / ROLE_LABEL_SHORT / ROLE_TAGLINE", () => {
  it("has a label for every role including admin", () => {
    const allRoles = [...WORKSPACE_ROLES, "admin"] as const;
    for (const r of allRoles) {
      expect(ROLE_LABEL[r]).toBeTruthy();
      expect(ROLE_LABEL_SHORT[r]).toBeTruthy();
      expect(ROLE_TAGLINE[r]).toBeTruthy();
    }
  });
});

describe("isValidRole", () => {
  it("accepts all workspace roles plus admin", () => {
    expect(isValidRole("marketing")).toBe(true);
    expect(isValidRole("sales")).toBe(true);
    expect(isValidRole("product")).toBe(true);
    expect(isValidRole("customer_success")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
  });

  it("rejects unknown role strings", () => {
    expect(isValidRole("operations")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("MARKETING")).toBe(false); // case-sensitive on purpose
  });
});

describe("LENS_OPTIONS / LENS_LABEL", () => {
  it("starts with 'all' and includes every workspace role", () => {
    expect(LENS_OPTIONS[0]).toBe("all");
    for (const role of WORKSPACE_ROLES) {
      expect(LENS_OPTIONS).toContain(role);
    }
  });

  it("has a label for every lens option", () => {
    for (const opt of LENS_OPTIONS) {
      expect(LENS_LABEL[opt]).toBeTruthy();
    }
  });
});

describe("filterWorkflowsForLens", () => {
  const sample = [
    { code: "R-CI", roles: ["marketing", "sales", "product"] as Role[] },
    { code: "D-MG", roles: ["marketing"] as Role[] },
    { code: "D-QB", roles: ["customer_success"] as Role[] },
    { code: "A0", roles: ["admin"] as Role[] },
  ];

  it("returns the full list when lens is 'all'", () => {
    expect(filterWorkflowsForLens(sample, "all")).toEqual(sample);
  });

  it("returns only workflows tagged with the selected role", () => {
    const marketing = filterWorkflowsForLens(sample, "marketing").map((w) => w.code);
    expect(marketing).toEqual(["R-CI", "D-MG"]);

    const cs = filterWorkflowsForLens(sample, "customer_success").map((w) => w.code);
    expect(cs).toEqual(["D-QB"]);
  });

  it("preserves source list order in the filtered output", () => {
    const sales = filterWorkflowsForLens(sample, "sales").map((w) => w.code);
    expect(sales).toEqual(["R-CI"]);
  });

  it("returns an empty array when no workflows match the lens", () => {
    expect(filterWorkflowsForLens(sample, "sales").length).toBe(1);
    const empty = filterWorkflowsForLens(
      [{ code: "X-only-admin", roles: ["admin"] as Role[] }],
      "sales",
    );
    expect(empty).toEqual([]);
  });
});

describe("outputsForLens", () => {
  it("returns the marketing list when lens is marketing", () => {
    const out = outputsForLens("marketing");
    expect(out.some((o) => o.href === "/workspace/marketing")).toBe(true);
    expect(out.some((o) => o.href === "/positioning")).toBe(true);
  });

  it("returns just the role dashboard when lens is sales/product/customer_success", () => {
    expect(outputsForLens("sales")).toEqual([
      expect.objectContaining({ href: "/workspace/sales" }),
    ]);
    expect(outputsForLens("product")).toEqual([
      expect.objectContaining({ href: "/workspace/product" }),
    ]);
    expect(outputsForLens("customer_success")).toEqual([
      expect.objectContaining({ href: "/workspace/customer_success" }),
    ]);
  });

  it("merges every role's outputs without duplicates when lens is 'all'", () => {
    const all = outputsForLens("all");
    const hrefs = all.map((o) => o.href);
    // Each marketing surface present
    expect(hrefs).toContain("/workspace/marketing");
    expect(hrefs).toContain("/positioning");
    // Each non-marketing role dashboard present
    expect(hrefs).toContain("/workspace/sales");
    expect(hrefs).toContain("/workspace/product");
    expect(hrefs).toContain("/workspace/customer_success");
    // No duplicates
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("layerForCode", () => {
  it("recognizes R / S / D / X / I prefixes", () => {
    expect(layerForCode("R-CI")).toBe("R");
    expect(layerForCode("S-PO")).toBe("S");
    expect(layerForCode("D-MG")).toBe("D");
    expect(layerForCode("X-EM")).toBe("X");
    expect(layerForCode("I-LN")).toBe("I");
  });

  it("treats A0 (and any unknown prefix) as A / Setup", () => {
    expect(layerForCode("A0")).toBe("A");
    expect(layerForCode("Z-XX")).toBe("A");
    expect(layerForCode("")).toBe("A");
  });

  it("is case-insensitive on the prefix letter", () => {
    expect(layerForCode("r-ci")).toBe("R");
    expect(layerForCode("d-mg")).toBe("D");
  });
});

describe("LAYER_ORDER", () => {
  it("places research first and setup last", () => {
    expect(LAYER_ORDER[0]).toBe("R");
    expect(LAYER_ORDER[LAYER_ORDER.length - 1]).toBe("A");
  });
});

describe("groupWorkflowsByLayer", () => {
  const sample = [
    { code: "R-CI" },
    { code: "S-PO" },
    { code: "D-MG" },
    { code: "X-EM" },
    { code: "A0" },
    { code: "R-MS" },
    { code: "D-WW" },
  ];

  it("groups workflows by layer prefix in LAYER_ORDER", () => {
    const groups = groupWorkflowsByLayer(sample);
    const keys = groups.map((g) => g.key);
    expect(keys).toEqual(["R", "S", "D", "X", "A"]);
  });

  it("preserves source order within each group", () => {
    const groups = groupWorkflowsByLayer(sample);
    const research = groups.find((g) => g.key === "R");
    expect(research?.workflows.map((w) => w.code)).toEqual(["R-CI", "R-MS"]);
    const delivery = groups.find((g) => g.key === "D");
    expect(delivery?.workflows.map((w) => w.code)).toEqual(["D-MG", "D-WW"]);
  });

  it("omits empty groups", () => {
    const onlyResearch = [{ code: "R-CI" }, { code: "R-MS" }];
    const groups = groupWorkflowsByLayer(onlyResearch);
    expect(groups.length).toBe(1);
    expect(groups[0].key).toBe("R");
  });

  it("returns an empty list when no workflows are supplied", () => {
    expect(groupWorkflowsByLayer([])).toEqual([]);
  });

  it("attaches the human-readable label to each group", () => {
    const groups = groupWorkflowsByLayer([{ code: "S-PO" }, { code: "X-EM" }]);
    expect(groups.find((g) => g.key === "S")?.label).toBe("Synthesis");
    expect(groups.find((g) => g.key === "X")?.label).toBe("Distribution");
  });
});
