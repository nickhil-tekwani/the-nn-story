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
    desc: "Thick noodles, ma-la spice, sesame, pork soboro, blanched bok choi. Can be made vegetarian or vegan.",
    tag: "Veg on request",
  },
  {
    name: "Aburasoba",
    desc: "Soupless noodles, garlic, soy sauce, menma, beansprouts, chopped chashu, crispy textures.",
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
    alt: "Soupless Tantanmen, hold the pork.",
    tip: "Add an egg to either for the full experience.",
  },
  {
    num: 2,
    name: "Chicken Only",
    diet: "Chicken yes; no pork or fish",
    best: "Midwest Shoyu — remove the pork topping, keep the chicken.",
    alt: "Soupless Tantanmen, hold the pork, add chicken for protein.",
    tip: "Extra egg or mala spice on request.",
  },
  {
    num: 3,
    name: "Pescatarian",
    diet: "Fish + chicken; no pork",
    best: "Midwest Shoyu — broth has chicken & fish. Just remove the pork topping.",
    alt: "Soupless Tantanmen, hold the pork, add chicken.",
    tip: "Extra egg or mala spice on request.",
  },
  {
    num: 4,
    name: "Eat Everything",
    diet: "Pork, chicken, fish — the works",
    best: "Akahoshi Miso — broth and toppings both bring the pork. The full experience.",
    alt: "Midwest Shoyu for a lighter broth, or Soupless Tantanmen.",
    tip: "Add an egg or mala spice and go all in.",
  },
];

/* ---- Drinks data ---- */

const beerSake = [
  { name: "Sapporo", desc: "Premium Japanese lager." },
  { name: "Hokkaido Handshake", desc: "A shot of umeshu alongside a Sapporo." },
  { name: "Ozeki Sake", desc: "The original single-cup sake, served in 6oz cups." },
  { name: "Toki Whiskey", desc: "Suntory Toki — neat, on the rocks, or as a highball." },
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
  { name: "Coke · Diet Coke · Sprite", desc: "The classics, ice cold." },
];

const TABS = ["The Bowls", "Drinks"];

export default function MenuTabs() {
  const [active, setActive] = useState(0);
  const panelRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  const [height, setHeight] = useState<number | undefined>(undefined);

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

  return (
    <div>
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
          {/* Panel 0 — The Bowls + Find Your Group */}
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
          </div>

          {/* Panel 1 — Drinks */}
          <div
            ref={panelRefs[1]}
            className={styles.panel}
            role="tabpanel"
            aria-hidden={active !== 1}
          >
            <h2 className={styles.subTitle}>Beer &amp; Sake</h2>
            <hr className={styles.sectionRule} />
            {beerSake.map((d) => (
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
