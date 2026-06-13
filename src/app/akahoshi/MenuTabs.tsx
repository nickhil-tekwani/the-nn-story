"use client";

import { useLayoutEffect, useRef, useState } from "react";
import styles from "./akahoshi.module.css";

/* ---- Food data ---- */

const bowls = [
  {
    name: "Akahoshi Miso",
    desc: "The namesake bowl. Blend of misos, crinkly Sapporo-style noodles, beansprouts, green onion, menma, pork chashu.",
  },
  {
    name: "Midwest Shoyu",
    desc: "Clear chicken soup, soy sauce & katsuobushi, thin Midwest-wheat noodles, nori, menma, pork chashu, shio-koji chicken.",
  },
  {
    name: "Soupless Tantanmen",
    desc: "Thick noodles, Mala or Gekikara spice powder, sesame, pork soboro, blanched bok choi. Can be made vegetarian or vegan.",
    tag: "Veg on request",
  },
  {
    name: "Hiyashi Tantanmen",
    desc: "A cold riff on the soupless tantanmen — tart and bracing. Sesame, black vinegar, chili oil, chilled thick noodles, cucumber, cilantro, bok choi, crumbled cashews.",
    tag: "Limited · Cold",
  },
  {
    name: "Veggie-Kotsu",
    desc: "A plant-based tonkotsu. Cashew cream, soy milk, burnt garlic oil, baked tofu, woodear, nori. Vegan on request.",
    tag: "Vegetarian",
  },
];

const groups = [
  {
    num: 1,
    name: "Fully Vegetarian",
    diet: "No pork, chicken, or fish",
    best: "Veggie-Kotsu, as-is — broth and toppings are already vegetarian.",
    alt: "Soupless Tantanmen, hold the pork — noodles only, no broth.",
    tip: "Add an egg to either for the full experience.",
  },
  {
    num: 2,
    name: "No Pork",
    diet: "Chicken + fish OK; skip the pork",
    best: "Midwest Shoyu — remove the pork topping, keep the chicken.",
    alt: "Soupless Tantanmen, hold the pork — noodles only, no broth.",
    tip: "Extra egg or Mala/Gekikara spice powder on request.",
  },
  {
    num: 3,
    name: "Eat Everything",
    diet: "Pork, chicken, fish — the works",
    best: "Akahoshi Miso — broth and toppings both bring the pork. The full experience.",
    alt: "Midwest Shoyu for a lighter broth, or Soupless Tantanmen.",
    tip: "Add an egg or Mala/Gekikara spice powder and go all in.",
  },
];

/* ---- Drinks data ---- */

const beer = [
  { name: "Sapporo", desc: "Premium Japanese lager." },
  { name: "Hokkaido Handshake", desc: "A Sapporo alongside a shot of umeshu. Umeshu is a Japanese plum liqueur — fruity, sweet-tart, and served cold.", bold: "You can also order the umeshu as a standalone shot if you just want that." },
  { name: "Toki Whiskey", desc: "Suntory Toki — neat, on the rocks, or as a shot." },
];

const sake = [
  { name: "Ozeki Sake (Cold)", desc: "The house sake — reliable and approachable, served cold in 6oz pours. Think of it as the \"house lager\" of the sake list." },
  { name: "Kanbara Bride of the Fox (Hot)", desc: "The standout bottle. A Junmai Ginjo that drinks more like a good white wine than what most people picture as sake — honeydew, pistachio, grilled nuts, white chocolate, and a dry, savory finish with lots of umami. Especially good with the richer bowls." },
  { name: "Sho Chiku Bai Silky Mild Nigori (Cold)", desc: "The crowd-pleaser. Creamy, fruity, sweet, and almost dessert-like — the cloudy unfiltered one. If you like Moscato, boba milk tea, or sweeter cocktails, you'll love this. Served in 4oz pours." },
];

const featuredCocktails = [
  {
    who: "His",
    name: "Hideki Matsuyama",
    desc: "A boozy Arnold Palmer with Japanese ingredients. Japanese oolong, shochu, housemade lemonade.",
  },
  {
    who: "Hers",
    name: "Lychee Martini",
    desc: "Roku gin, lychee liqueur, elderflower syrup, Lillet Blanc.",
  },
];

const highballVariants = [
  { name: "Toki", base: "whiskey" },
  { name: "Yuzu", base: "yuzu liqueur" },
  { name: "Sakura", base: "vodka" },
];

const naDrinks = [
  { name: "Sapporo N/A", desc: "Non-alcoholic Japanese lager." },
  { name: "Ramune", desc: "The original Japanese marble soda.", flavors: ["Original", "Melon", "Grape", "Lychee"] },
  { name: "Coke · Diet Coke · Sprite", desc: "The classics, ice cold." },
];

/* ---- Guest data ---- */

type Guest = {
  name: string;
  chicken: boolean;
  pork: boolean;
  egg: boolean;
  dairyFree?: boolean;   // also egg-free (Saarthi)
  sesameFree?: boolean;  // also nut-free (Diya)
  noVisibleEgg?: boolean; // ok hidden in baked goods, not on a bowl (Sidhi)
};

const guests: Guest[] = [
  { name: "Adarsh Kapoor",      chicken: true,  pork: true,  egg: true  },
  { name: "Aishu Tallikar",     chicken: true,  pork: false, egg: true  },
  { name: "Aneesh Singh",       chicken: true,  pork: true,  egg: true  },
  { name: "Ashnee Patel",       chicken: true,  pork: true,  egg: true  },
  { name: "Atharva Mehendale",  chicken: true,  pork: true,  egg: true  },
  { name: "Devki Patel",        chicken: false, pork: false, egg: true  },
  { name: "Diya Jindal",        chicken: false, pork: false, egg: true,  sesameFree: true },
  { name: "Esha Aggarwal",      chicken: true,  pork: true,  egg: true  },
  { name: "Krishna Revur",      chicken: false, pork: false, egg: true  },
  { name: "Manshu Sharma",      chicken: true,  pork: false, egg: true  },
  { name: "nikki",              chicken: true,  pork: true,  egg: true  },
  { name: "Pav Pennathur",      chicken: false, pork: false, egg: true  },
  { name: "Pri Balekai",        chicken: false, pork: false, egg: true  },
  { name: "Priya Srini",        chicken: true,  pork: false, egg: true  },
  { name: "Rahul Bahl",         chicken: true,  pork: true,  egg: true  },
  { name: "Ria Marathe",        chicken: true,  pork: true,  egg: true  },
  { name: "Rishi Karthik",      chicken: true,  pork: false, egg: true  },
  { name: "Rishi Reddy",        chicken: true,  pork: true,  egg: true  },
  { name: "Roshan Shirahatti",  chicken: true,  pork: false, egg: true  },
  { name: "Saarthi Jethi",      chicken: true,  pork: false, egg: false, dairyFree: true },
  { name: "Sanjay Ganesh",      chicken: true,  pork: true,  egg: true  },
  { name: "Shivani Goyal",      chicken: false, pork: false, egg: true  },
  { name: "Shreya Shaw",        chicken: true,  pork: true,  egg: true  },
  { name: "Sidhi Birani",       chicken: false, pork: false, egg: false, noVisibleEgg: true },
  { name: "Sruthi Murugesh",    chicken: true,  pork: false, egg: true  },
  { name: "tek",                chicken: true,  pork: true,  egg: true  },
  { name: "Vidhan Bhardwaj",    chicken: false, pork: false, egg: true  },
  { name: "Yash Goyal",         chicken: true,  pork: true,  egg: true  },
];

/* ---- Personalized card ---- */

function PersonalizedCard({ guest }: { guest: Guest }) {
  if (guest.pork) {
    return (
      <div className={styles.guestCard}>
        <p className={styles.guestOpener}>
          You eat everything — you&apos;re exactly who Akahoshi built this menu
          for. Order freely.
        </p>
        <p className={styles.rec}>
          <span className={styles.recLabel}>Order</span>
          <strong>Akahoshi Miso</strong> — the namesake bowl. Full pork chashu,
          crinkly Sapporo noodles, the whole deal.
        </p>
        <p className={styles.rec}>
          <span className={styles.recLabel}>Or</span>
          <strong>Midwest Shoyu</strong> for a lighter broth, or{" "}
          <strong>Soupless Tantanmen</strong> if you want noodles only, no
          broth.
        </p>
        <p className={styles.rec}>
          <span className={styles.recLabel}>Also</span>
          <strong>Hiyashi Tantanmen</strong> (limited) — cold sesame
          noodles with black vinegar and chili oil. A great pick if you want
          something refreshing instead of hot.
        </p>
        <p className={styles.tip}>
          Add a soft-boiled egg or Mala/Gekikara spice powder — both available
          on request.
        </p>
      </div>
    );
  }

  if (guest.chicken) {
    return (
      <div className={styles.guestCard}>
        <p className={styles.guestOpener}>
          I see you eat chicken but not pork — the Midwest Shoyu was built for
          you.
        </p>
        <p className={styles.rec}>
          <span className={styles.recLabel}>Order</span>
          <strong>Midwest Shoyu</strong> — ask them to remove the pork chashu
          topping. The shio-koji chicken stays, and the broth has chicken +
          katsuobushi (fish).
        </p>
        <p className={styles.rec}>
          <span className={styles.recLabel}>Or</span>
          <strong>Soupless Tantanmen, hold the pork</strong> — noodles only,
          no broth, if you want something different.
        </p>
        {guest.egg && (
          <p className={styles.tip}>
            Add a soft-boiled egg or Mala/Gekikara spice powder on request.
          </p>
        )}
        {guest.dairyFree && (
          <p className={styles.guestWarning}>
            Since you&apos;re allergic to dairy and eggs: skip the egg add-on,
            and avoid the Veggie-Kotsu (cashew cream broth). Let your server
            know — they&apos;ll look out for you.
          </p>
        )}
      </div>
    );
  }

  // Vegetarian
  return (
    <div className={styles.guestCard}>
      <p className={styles.guestOpener}>
        {guest.noVisibleEgg
          ? "You don't eat meat and skip visible eggs — both plant-based bowls work great for you."
          : "You don't eat any meat — the plant-based options here are genuinely good."}
      </p>
      <p className={styles.rec}>
        <span className={styles.recLabel}>Order</span>
        <strong>Veggie-Kotsu</strong> — plant-based tonkotsu with cashew cream,
        soy milk, burnt garlic oil, baked tofu. Already vegetarian as-is,
        nothing to change.
      </p>
      {!guest.sesameFree && (
        <p className={styles.rec}>
          <span className={styles.recLabel}>Or</span>
          <strong>Soupless Tantanmen, hold the pork</strong> — noodles only, no
          broth, can be made fully vegan.
        </p>
      )}
      {!guest.sesameFree && (
        <p className={styles.rec}>
          <span className={styles.recLabel}>Also</span>
          <strong>Hiyashi Tantanmen</strong> (limited) — ask for the
          vegetarian version. Cold sesame noodles, black vinegar, chili oil,
          cucumber. A cold option if you don&apos;t want something hot.
        </p>
      )}
      {guest.egg && !guest.noVisibleEgg && (
        <p className={styles.tip}>
          Add a soft-boiled egg to either for extra richness.
        </p>
      )}
      {guest.noVisibleEgg && (
        <p className={styles.tip}>
          Skip the soft-boiled egg add-on — but everything else on the
          Veggie-Kotsu is totally fine.
        </p>
      )}
      {guest.sesameFree && (
        <p className={styles.guestWarning}>
          Since you&apos;re allergic to sesame and nuts, skip the Soupless
          Tantanmen — it has sesame. Stick to Veggie-Kotsu and let your server
          know about your allergies so they can confirm the prep.
        </p>
      )}
    </div>
  );
}

/* ---- Tab component ---- */

const TABS = ["Bowls", "Drinks"];

export default function MenuTabs() {
  const [active, setActive] = useState(1);
  const [selectedName, setSelectedName] = useState("");
  const panelRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [height, setHeight] = useState<number | undefined>(undefined);

  const selectedGuest = guests.find((g) => g.name === selectedName) ?? null;

  // Size the viewport to the active panel so the slide also grows/shrinks smoothly.
  useLayoutEffect(() => {
    const measure = () => {
      const el = panelRefs[active].current;
      if (el) setHeight(el.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Re-measure when a guest is selected (card changes panel height).
  useLayoutEffect(() => {
    const el = panelRefs[active].current;
    if (el) setHeight(el.offsetHeight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuest]);

  return (
    <div>
      {/* Guest picker */}
      <div className={styles.guestSection}>
        <label className={styles.guestLabel} htmlFor="guest-select">
          Who are you?
        </label>
        <div className={styles.guestSelectWrap}>
          <select
            id="guest-select"
            className={styles.guestSelect}
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
          >
            <option value="">Pick your name →</option>
            {guests.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
          <span className={styles.guestSelectArrow} aria-hidden>▾</span>
        </div>
        {selectedGuest && <PersonalizedCard guest={selectedGuest} />}
      </div>

      <div role="tablist" aria-label="Menu" className={styles.tabs}>
        {TABS.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={active === i}
            className={active === i ? styles.tabActive : styles.tab}
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.viewport} style={{ height }}>
        <div
          className={styles.track}
          style={{ transform: `translateX(-${active * 50}%)` }}
        >
          {/* Panel 0 — Bowls + Find Your Group */}
          <div
            ref={panelRefs[0]}
            className={styles.panel}
            role="tabpanel"
            aria-hidden={active !== 0}
          >
            {bowls.map((b) => (
              <div key={b.name} className={styles.bowl}>
                <p className={styles.bowlName}>
                  {b.name}
                  {b.tag && <span className={styles.tag}>{b.tag}</span>}
                </p>
                <p className={styles.bowlDesc}>{b.desc}</p>
              </div>
            ))}

            <h2 className={styles.subTitle}>Find Your Group</h2>
            <hr className={styles.sectionRule} />
            {groups.map((g) => (
              <div key={g.num} className={styles.group}>
                <div className={styles.groupHead}>
                  <span className={styles.groupNum}>{g.num}</span>
                  <span className={styles.groupName}>{g.name}</span>
                </div>
                <p className={styles.groupDiet}>{g.diet}</p>
                <p className={styles.rec}>
                  <span className={styles.recLabel}>Order</span>
                  {g.best}
                </p>
                <p className={styles.rec}>
                  <span className={styles.recLabel}>Or</span>
                  {g.alt}
                </p>
                <p className={styles.tip}>{g.tip}</p>
              </div>
            ))}
            <p className={styles.footerNote}>
              Every bowl can have the pork topping removed — just ask. Egg and
              Mala/Gekikara spice powder are available add-ons. When in doubt,
              ask your server.
            </p>
          </div>

          {/* Panel 1 — Drinks */}
          <div
            ref={panelRefs[1]}
            className={styles.panel}
            role="tabpanel"
            aria-hidden={active !== 1}
          >
            <h2 className={styles.subTitle}>Beer &amp; Whiskey</h2>
            <hr className={styles.sectionRule} />
            {beer.map((d) => (
              <div key={d.name} className={styles.bowl}>
                <p className={styles.bowlName}>{d.name}</p>
                <p className={styles.bowlDesc}>{d.desc}{d.bold && <> <strong>{d.bold}</strong></>}</p>
              </div>
            ))}

            <h2 className={styles.subTitle}>Sake</h2>
            <hr className={styles.sectionRule} />
            {sake.map((d) => (
              <div key={d.name} className={styles.bowl}>
                <p className={styles.bowlName}>{d.name}</p>
                <p className={styles.bowlDesc}>{d.desc}</p>
              </div>
            ))}

            <h2 className={styles.subTitle}>Cocktails</h2>
            <hr className={styles.sectionRule} />
            <div className={styles.featured}>
              {featuredCocktails.map((c) => (
                <div key={c.who} className={styles.featuredCard}>
                  <p className={styles.who}>
                    {c.who} <span className={styles.star}>★</span>
                  </p>
                  <p className={styles.featuredName}>{c.name}</p>
                  <p className={styles.featuredDesc}>{c.desc}</p>
                </div>
              ))}
            </div>

            <h2 className={styles.subTitle}>Highball, Your Way</h2>
            <hr className={styles.sectionRule} />
            <p className={styles.highballNote}>
              Pick your base, topped with supercharged highball soda.
            </p>
            <div className={styles.pillRow}>
              {highballVariants.map((v) => (
                <span key={v.name} className={styles.pill}>
                  {v.name} <em>{v.base}</em>
                </span>
              ))}
            </div>

            <h2 className={styles.subTitle}>No-ABV</h2>
            <hr className={styles.sectionRule} />
            {naDrinks.map((d) => (
              <div key={d.name} className={styles.bowl}>
                <p className={styles.bowlName}>{d.name}</p>
                <p className={styles.bowlDesc}>{d.desc}</p>
                {d.flavors && (
                  <div className={styles.pillRow} style={{ marginTop: "0.6rem" }}>
                    {d.flavors.map((f) => (
                      <span key={f} className={styles.pill}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
