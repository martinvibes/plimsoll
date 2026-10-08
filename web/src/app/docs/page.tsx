import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronRight } from "lucide-react";
import Link from "@/components/AppLink";
import { LEDGER } from "@/lib/ledger/config";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Docs — How Plimsoll works",
  description:
    "How Plimsoll pools private-loan marks without revealing them: secret shares across three nodes, on-ledger sums, and Canton Coin settlement.",
};

const chapters = [
  {
    label: "Understand it",
    links: [
      ["overview", "Overview"],
      ["problem", "Why marks disagree"],
      ["shares", "How a mark is hidden"],
    ],
  },
  {
    label: "Use it",
    links: [
      ["round", "A round, step by step"],
      ["readers", "Buying a mark"],
      ["collateral", "Marks as collateral prices"],
    ],
  },
  {
    label: "Trust it",
    links: [
      ["privacy", "Who sees what"],
      ["limits", "What it does not do"],
      ["questions", "Common questions"],
      ["run", "Run it"],
    ],
  },
];

function Contents() {
  return (
    <nav aria-label="Documentation sections">
      {chapters.map((chapter) => (
        <div className={styles.chapter} key={chapter.label}>
          <p>{chapter.label}</p>
          {chapter.links.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

const questions = [
  [
    "Could two nodes collude?",
    "Yes: any two nodes together hold all three shares of every mark. That is the trust model of 2-of-3 sharing, and why the three seats should be independent firms. No single node, and no node with any number of funds it does not control, learns a mark.",
  ],
  [
    "Could a fund lie?",
    "A fund can submit any price, as it can in any survey. It cannot submit more than once per round, cannot join without all three nodes approving it, and cannot send different shares to different nodes without stopping the round: where two reports overlap, the column sums must match exactly.",
  ],
  [
    "Why at least five funds?",
    "With the mean and spread published, a contributor in a round of three could solve for the other two marks. The model refuses a panel whose minimum is below four; the demo panel uses five.",
  ],
  [
    "Who executes a reader’s payment?",
    "The panel’s first node is the settlement executor. It can only execute allocations the reader created for exactly the listed fee legs, and the reader receives the mark in the same transaction. If any leg falls short, nothing settles and no mark is delivered.",
  ],
];

export default function Documentation() {
  return (
    <div className={styles.docs}>
      <aside className={styles.sidebar} aria-label="Guide navigation">
        <Link href="/docs" className={styles.docsBrand}>
          <BookOpen size={17} aria-hidden="true" /> Plimsoll Docs
        </Link>
        <Contents />
        <div className={styles.sidebarFoot}>
          <span className={styles.networkDot} />
          {LEDGER.network}
          <Link href="/marks">
            Open the app <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className={styles.readingColumn}>
        <div className={styles.breadcrumb}>
          <Link href="/">Plimsoll</Link>
          <ChevronRight size={13} aria-hidden="true" />
          <span>Documentation</span>
        </div>
        <details className={styles.mobileContents}>
          <summary>
            <BookOpen size={16} aria-hidden="true" /> In this guide
          </summary>
          <Contents />
        </details>
        <article className={styles.article} aria-labelledby="docs-title">
          <header className={styles.intro} id="overview">
            <p className={styles.eyebrow}>Consensus marks, explained</p>
            <h1 id="docs-title">
              How Plimsoll <em>works.</em>
            </h1>
            <p className={styles.lead}>
              Funds that hold the same private loan each send a price for it. Nobody sees any single price, not even the
              nodes that run the panel. Everyone who contributed gets the average and the spread back, and lenders can
              buy them in Canton Coin.
            </p>
            <div className={styles.thesis}>
              <span>⦵</span>
              <p>
                A Plimsoll line is the mark painted on a ship’s hull that shows how low it can safely sit in the water.
                This one shows where a private loan is really priced.
              </p>
            </div>
          </header>

          <section id="problem">
            <p className={styles.sectionLabel}>The problem</p>
            <h2>Why marks disagree</h2>
            <p>
              Private loans rarely trade, so every fund that holds one prices it itself, quarter after quarter. Two funds
              can carry the same loan at different prices, and the banks that lend against those funds’ portfolios have
              to take each fund’s number or pay for a valuation of their own.
            </p>
            <p>
              Funds would compare notes if they could do it without showing their book to competitors. On a public chain
              they can’t: every price would be visible to everyone. Plimsoll uses Canton’s privacy, where each party sees
              only the contracts it is a party to, plus secret sharing, so that even the panel’s operators see nothing.
            </p>
          </section>

          <section id="shares">
            <p className={styles.sectionLabel}>The cryptography</p>
            <h2>How a mark is hidden</h2>
            <p>
              A fund’s price <code>x</code>, in hundredths of a point, is split in its browser into three numbers that
              add up to it modulo the prime <code>p = 2⁶¹ − 1</code>:
            </p>
            <p className={styles.equation}>x ≡ s₁ + s₂ + s₃ (mod p)</p>
            <p>
              Two of the shares are drawn at random; the third makes the sum come out. Any one or two shares are
              uniformly random and say nothing about <code>x</code>. Seat <strong>k</strong> receives every share except{" "}
              <strong>sₖ</strong>, so each node holds two pieces and no node holds all three. The fund does the same for{" "}
              <code>x²</code>, which is what lets the panel publish a spread as well as a mean.
            </p>
            <p>
              Adding the same share across every fund gives a column. Each node can add the two columns it holds without
              learning anything, and any two nodes’ columns together cover all three. Their sum is the total of every
              fund’s mark: the only thing anyone ever learns.
            </p>
          </section>

          <section id="round">
            <p className={styles.sectionLabel}>The workflow</p>
            <h2>A round, step by step</h2>
            <ol className={styles.steps}>
              <li>
                <div>
                  <h3>A node opens a round</h3>
                  <p>
                    For one loan and one valuation date. Every admitted fund receives three invitations, one signed by
                    each node, and nothing else: no fund sees the round or who was invited.
                  </p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Funds send their parcels</h3>
                  <p>
                    One transaction exercises all three invitations. Each creates a parcel signed by the fund and one
                    node, so each node sees exactly its own parcel.
                  </p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Nodes report</h3>
                  <p>
                    After the close, each node collects its parcels through its own seat and the column sums are
                    computed in Daml from the parcels themselves, so a node can’t report numbers it didn’t receive. A
                    report fails below the panel’s minimum number of funds.
                  </p>
                </div>
              </li>
              <li>
                <div>
                  <h3>Any two reports publish</h3>
                  <p>
                    The reports must cover the same funds and agree on the column they share. The mark records the
                    mean, the standard deviation and how many funds contributed, never which ones. Each contributor gets
                    its own copy.
                  </p>
                </div>
              </li>
            </ol>
          </section>

          <section id="readers">
            <p className={styles.sectionLabel}>Canton Coin</p>
            <h2>Buying a mark</h2>
            <p>
              A reader, typically a lender to private-credit funds, sees a listing for each published mark: the loan,
              the date and how many funds marked it, but not the number. Buying opens a CIP-56{" "}
              <code>AllocationRequest</code> with one fee leg to each node. The reader’s wallet allocates its own Canton
              Coin to each leg, and the executor settles all three legs and creates the reader’s copy in one
              transaction. Fees go to the nodes, never to the funds, so a payment reveals nothing about who
              contributed.
            </p>
          </section>

          <section id="collateral">
            <p className={styles.sectionLabel}>Using the number</p>
            <h2>Marks as collateral prices</h2>
            <p>
              A lender to a fund values each loan in the borrowing base at the lower of the fund’s own mark and an
              independent price. Plimsoll gives it one: the app’s calculator uses the consensus less one standard
              deviation, times the advance rate. The calculation runs in the reader’s browser; nothing about the
              reader’s book goes back to the ledger.
            </p>
            <p className={styles.asideNote}>
              The haircut rule is the reader’s own choice; the app shows one common form of it.
            </p>
          </section>

          <section id="privacy">
            <p className={styles.sectionLabel}>Privacy</p>
            <h2>Who sees what</h2>
            <div className={styles.definitionRows}>
              <div>
                <h3>A node</h3>
                <p>Its own parcels (two shares per fund), the rounds, the members, the other nodes’ column sums.</p>
              </div>
              <div>
                <h3>A fund</h3>
                <p>Its own membership, invitations, parcels and copy of each mark. Never another fund.</p>
              </div>
              <div>
                <h3>Its auditor</h3>
                <p>All three of its client’s parcels, so it can rebuild what the client submitted, and its copy.</p>
              </div>
              <div>
                <h3>A reader</h3>
                <p>Its listings and the marks it paid for. No round, no fund, no share.</p>
              </div>
            </div>
            <p>
              The <Link href="/privacy">Who sees what</Link> page reads each party’s view from the ledger live. Every
              claim here is also a Daml test in <code>daml/plimsoll-tests</code>.
            </p>
          </section>

          <section id="limits">
            <p className={styles.sectionLabel}>Honest scope</p>
            <h2>What it does not do</h2>
            <p>
              <strong>It can’t range-check a secret.</strong> A fund could submit an absurd price. The model refuses sums
              that no set of prices between 0 and 200 could produce, which stops gross errors, but a single mark that is
              merely wrong lands in the average, as it would in any survey. The spread shows it.
            </p>
            <p>
              <strong>Two colluding nodes see everything.</strong> That is the 2-of-3 threshold, and why seats should go
              to independent firms.
            </p>
            <p>
              <strong>The demo submits for everyone.</strong> This app holds every persona so one person can play all of
              them. In production each fund splits its mark in its own client and submits from its own participant.
            </p>
          </section>

          <section id="questions">
            <p className={styles.sectionLabel}>FAQ</p>
            <h2>Common questions</h2>
            <div className={styles.questions}>
              {questions.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <div className={styles.detailsBody}>
                    <p>{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section id="run">
            <p className={styles.sectionLabel}>Developers</p>
            <h2>Run it</h2>
            <pre>{`make build      # Daml model, tests and demo seed
make test       # the claims on this page, as Daml tests
make sandbox    # local Canton ledger with the JSON API
make seed       # parties, panel, funds, three marks, one live round
make smoke      # every write the app makes, checked against the ledger
make web        # this app on http://localhost:3000`}</pre>
            <div className={styles.endNote}>
              <span>Every number in the app is read from the ledger as the party you are acting as.</span>
              <Link href="/contribute">
                Contribute a mark <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link href="/privacy">
                Who sees what <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}
