// Template and interface references by package name, resolved by the ledger
// to the vetted package version.

const plimsoll = (module: string, entity: string) => `#plimsoll:Plimsoll.${module}:${entity}`;

export const T = {
  Panel: plimsoll("Panel", "Panel"),
  Seat: plimsoll("Seat", "Seat"),
  Round: plimsoll("Round", "Round"),
  Invitation: plimsoll("Round", "Invitation"),
  Parcel: plimsoll("Round", "Parcel"),
  PartialSum: plimsoll("Round", "PartialSum"),
  ConsensusMark: plimsoll("Mark", "ConsensusMark"),
  MarkCopy: plimsoll("Mark", "MarkCopy"),
  MembershipApplication: plimsoll("Membership", "MembershipApplication"),
  Membership: plimsoll("Membership", "Membership"),
  Subscription: plimsoll("Access", "Subscription"),
  Listing: plimsoll("Access", "Listing"),
  ReadRequest: plimsoll("Access", "ReadRequest"),
} as const;

export const CIP56 = {
  Holding: "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding",
  Allocation: "#splice-api-token-allocation-v1:Splice.Api.Token.AllocationV1:Allocation",
  AllocationFactory:
    "#splice-api-token-allocation-instruction-v1:Splice.Api.Token.AllocationInstructionV1:AllocationFactory",
} as const;

/** The reference CIP-56 registry used on local ledgers. */
export const TEST_TOKEN_RULES = "#splice-test-token-v1:Splice.Testing.Tokens.TestTokenV1:TokenRules";
