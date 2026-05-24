import { describe, it, expect } from "vitest";
import {
  titleToRole,
  WORKSPACE_ROLES,
  ROLE_LABEL,
  ROLE_LABEL_SHORT,
  ROLE_TAGLINE,
  isValidRole,
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
