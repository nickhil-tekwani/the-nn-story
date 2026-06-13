import type { Metadata } from "next";
import { Gilda_Display, PT_Serif } from "next/font/google";
import styles from "./akahoshi.module.css";

const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
});
const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-pt",
});

export const metadata: Metadata = {
  title: "Akahoshi · Nickhil ♥ Nikki",
  description:
    "A little guide to ordering the perfect bowl at our engagement celebration.",
};

/* The bowls — trimmed from Akahoshi's menu so guests know the lineup. */
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

/* Dietary groups, renumbered 1–4. */
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

export default function AkahoshiMenu() {
  return (
    <div className={`${gilda.variable} ${ptSerif.variable} ${styles.page}`}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.couple}>
            Nickhil <span className={styles.star}>★</span> Nikki
          </p>
          <h1 className={styles.title}>How to Order</h1>
          <p className={styles.meta}>
            Engagement Celebration · Akahoshi Ramen, Chicago
          </p>
          <p className={styles.intro}>
            We&apos;re so glad you&apos;re here. Here&apos;s a little guide to
            help you land the perfect bowl — start with the lineup, then find
            your group below.
          </p>
        </header>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The Bowls</h2>
          <hr className={styles.sectionRule} />
          {bowls.map((b) => (
            <div key={b.name} className={styles.bowl}>
              <p className={styles.bowlName}>
                {b.name}
                {b.tag && <span className={styles.tag}>{b.tag}</span>}
              </p>
              <p className={styles.bowlDesc}>{b.desc}</p>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Find Your Group</h2>
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
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerNote}>
            Every bowl can have the pork topping removed — just ask. Egg and
            mala spice are available add-ons. When in doubt, ask your server.
          </p>
          <p className={styles.signoff}>
            Thank you for celebrating with us{" "}
            <span className={styles.star}>★</span>
          </p>
          <p className={styles.fine}>Nickhil &amp; Nikki · June 13, 2026</p>
        </footer>
      </div>
    </div>
  );
}
