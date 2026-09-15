"use client";

import { useState } from "react";
import Link from "next/link";
import { AIRLINES } from "@/lib/stayConstants";
import { track } from "@/lib/umami";
import styles from "./StayPlanner.module.css";

type Hotel = { id: number; canonicalName: string; locality: string; region: string };
type Lodging = { lodgingType: "hotel" | "friend_or_family" | "undecided"; hotelId: number | null; localArea: string | null; revision: number };
type Leg = { direction: "arrival" | "departure"; mode: TravelMode; localDateTime: string; travelDate: string | null; timePeriod: TimePeriod | null; airlineCode: string | null; otherAirlineName: string | null; flightNumber: string | null; revision: number };
type TravelMode = "flight" | "bus" | "drive" | "other" | "undecided";
type TimePeriod = "morning" | "afternoon" | "evening" | "night";
type StayData = { partySize: number; partyMembers: string[]; lodging: Lodging | null; legs: Leg[]; hotels: Hotel[]; hotelMatches: string[] };

const MODES: Array<[TravelMode, string]> = [["flight", "Flight"], ["drive", "Drive"], ["bus", "Bus"], ["other", "Other"], ["undecided", "Not sure yet"]];
const PERIODS: Array<[TimePeriod, string]> = [["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"]];

export default function StayPlanner({ initialData, firstName, apiBase = "/api/stay", backHref = "/engagement", heading = "Your Stay", showRecommendations = true, previewMode = false }: { initialData: StayData; firstName: string | null; apiBase?: string; backHref?: string; heading?: string; showRecommendations?: boolean; previewMode?: boolean }) {
  const [data, setData] = useState(initialData);
  const firstMissing = !data.lodging ? "lodging" : !data.legs.some((leg) => leg.direction === "arrival") ? "arrival" : !data.legs.some((leg) => leg.direction === "departure") ? "departure" : null;
  const [open, setOpen] = useState<string | null>(firstMissing);
  const chronologyWarning = getChronologyWarning(data.legs);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.nav}><Link href={backHref}>← Back</Link><span>Nickhil <span style={{ color: "var(--star)" }}>★</span> Nikki</span></nav>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Cincinnati</p><h1>{heading}</h1>
          <p className={styles.intro}>Welcome{firstName ? `, ${firstName}` : ""}. Share one plan for everyone in your attending party—you or anyone connected to your invitation can update it.</p>
          <span className={styles.travelerPill}>{data.partySize} {data.partySize === 1 ? "traveler" : "travelers"}: {data.partyMembers.join(", ")}</span>
          {previewMode && <p className={styles.adminPreview}>Admin preview · Example guest data · Saving is disabled</p>}
        </header>
        <div className={styles.stack}>
          <LodgingCard data={data} setData={setData} apiBase={apiBase} open={open === "lodging"} toggle={() => setOpen(open === "lodging" ? null : "lodging")} previewMode={previewMode} />
          <TravelCard direction="arrival" data={data} setData={setData} apiBase={apiBase} open={open === "arrival"} toggle={() => setOpen(open === "arrival" ? null : "arrival")} previewMode={previewMode} />
          <TravelCard direction="departure" data={data} setData={setData} apiBase={apiBase} open={open === "departure"} toggle={() => setOpen(open === "departure" ? null : "departure")} previewMode={previewMode} />
        </div>
        {chronologyWarning && <p className={styles.warning} role="status">{chronologyWarning}</p>}
        {data.hotelMatches.length > 0 && <HotelMatch names={data.hotelMatches} />}
        {showRecommendations && <Recommendations />}
      </div>
    </main>
  );
}

function CardHeader({ step, title, summary, open, toggle }: { step: string; title: string; summary: string; open: boolean; toggle: () => void }) {
  return <button type="button" className={styles.cardHeader} onClick={toggle} aria-expanded={open}>
    <span className={styles.step}>{step}</span><span><span className={styles.cardTitle}>{title}</span><span className={styles.summary}>{summary}</span></span><span className={styles.chevron}>{open ? "−" : "+"}</span>
  </button>;
}

function LodgingCard({ data, setData, apiBase, open, toggle, previewMode }: { data: StayData; setData: (data: StayData) => void; apiBase: string; open: boolean; toggle: () => void; previewMode: boolean }) {
  const initial = data.lodging;
  const [type, setType] = useState<Lodging["lodgingType"]>(initial?.lodgingType ?? "undecided");
  const [hotelId, setHotelId] = useState(initial?.hotelId ? String(initial.hotelId) : "");
  const [area, setArea] = useState(initial?.localArea ?? "");
  const [adding, setAdding] = useState(false);
  const [hotelName, setHotelName] = useState(""); const [hotelLocality, setHotelLocality] = useState(""); const [hotelRegion, setHotelRegion] = useState("OH");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  const hotel = data.hotels.find((item) => item.id === initial?.hotelId);
  const summary = !initial ? "Not answered" : initial.lodgingType === "hotel" ? hotel ? `${hotel.canonicalName} — ${hotel.locality}, ${hotel.region}` : "Hotel selected" : initial.lodgingType === "friend_or_family" ? `With friends or family in ${initial.localArea}` : "Not decided yet";

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (previewMode) return;
    setBusy(true); setError(null); setSaved(false);
    try {
      let selectedHotelId = hotelId ? Number(hotelId) : null;
      if (type === "hotel" && adding) {
        const hotelRes = await fetch(`${apiBase}/hotels`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ canonicalName: hotelName, locality: hotelLocality, region: hotelRegion }) });
        const hotelData = await hotelRes.json();
        if (!hotelRes.ok) { setError(hotelData.error || "Could not add that hotel."); return; }
        selectedHotelId = hotelData.hotel.id;
      }
      const res = await fetch(`${apiBase}/lodging`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lodgingType: type, hotelId: selectedHotelId, localArea: area, revision: initial?.revision ?? null }) });
      const next = await res.json(); if (!res.ok) { setError(next.error || "Could not save your stay."); return; }
      setData(next); setHotelId(selectedHotelId ? String(selectedHotelId) : ""); setAdding(false); setSaved(true); track("stay_lodging_saved", { lodgingType: type });
    } finally { setBusy(false); }
  }

  return <section className={styles.card}><CardHeader step="1" title="Where you're staying" summary={summary} open={open} toggle={toggle} />{open && <form className={styles.form} onSubmit={save}>
    <div className={styles.choiceRow}>{([["hotel", "Hotel"], ["friend_or_family", "Friends or family"], ["undecided", "Not sure yet"]] as const).map(([value, label]) => <button type="button" key={value} className={`${styles.choice} ${type === value ? styles.choiceActive : ""}`} onClick={() => { setType(value); setSaved(false); }}>{label}</button>)}</div>
    {type === "hotel" && !adding && <><label className={styles.label}>Hotel<select className={styles.select} value={hotelId} onChange={(e) => { setHotelId(e.target.value); setSaved(false); }}><option value="">Choose a hotel…</option>{data.hotels.map((item) => <option key={item.id} value={item.id}>{item.canonicalName} — {item.locality}, {item.region}</option>)}</select></label><button type="button" className={styles.choice} onClick={() => setAdding(true)}>My hotel isn&apos;t listed</button></>}
    {type === "hotel" && adding && <><label className={styles.label}>Exact full hotel name<input className={styles.input} value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Homewood Suites by Hilton Cincinnati-Downtown" /></label><div className={styles.twoCol}><label className={styles.label}>City, suburb, or neighborhood<input className={styles.input} value={hotelLocality} onChange={(e) => setHotelLocality(e.target.value)} placeholder="Cincinnati" /></label><label className={styles.label}>State<input className={styles.input} value={hotelRegion} maxLength={2} onChange={(e) => setHotelRegion(e.target.value.toUpperCase())} /></label></div><button type="button" className={styles.choice} onClick={() => setAdding(false)}>Choose an existing hotel instead</button></>}
    {type === "friend_or_family" && <><label className={styles.label}>Town, suburb, or neighborhood<input className={styles.input} value={area} onChange={(e) => { setArea(e.target.value); setSaved(false); }} placeholder="e.g. Oakley or Mason" /></label><p className={styles.hint}>Please don&apos;t include your host&apos;s name or street address.</p></>}
    {error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button className={styles.save} disabled={busy || previewMode}>{previewMode ? "Preview only" : busy ? "Saving…" : "Save stay"}</button>{saved && <span className={styles.saved}>Saved for your group</span>}</div>
  </form>}</section>;
}

function TravelCard({ direction, data, setData, apiBase, open, toggle, previewMode }: { direction: "arrival" | "departure"; data: StayData; setData: (data: StayData) => void; apiBase: string; open: boolean; toggle: () => void; previewMode: boolean }) {
  const initial = data.legs.find((item) => item.direction === direction);
  const [mode, setMode] = useState<TravelMode>(initial?.mode ?? "undecided"); const [dateTime, setDateTime] = useState(initial?.localDateTime ?? ""); const [date, setDate] = useState(initial?.travelDate ?? ""); const [period, setPeriod] = useState<TimePeriod | "">(initial?.timePeriod ?? ""); const [airline, setAirline] = useState(initial?.airlineCode ?? ""); const [otherAirline, setOtherAirline] = useState(initial?.otherAirlineName ?? ""); const [flight, setFlight] = useState(initial?.flightNumber ?? "");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  const title = direction === "arrival" ? "Getting to Cincinnati" : "Leaving Cincinnati";
  const summary = initial ? summarizeLeg(initial, direction) : "Not answered";
  async function save(event: React.FormEvent) { event.preventDefault(); if (previewMode) return; setBusy(true); setError(null); setSaved(false); try { const res = await fetch(`${apiBase}/travel/${direction}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, localDateTime: dateTime, travelDate: date, timePeriod: period, airlineCode: airline, otherAirlineName: otherAirline, flightNumber: flight, revision: initial?.revision ?? null }) }); const next = await res.json(); if (!res.ok) { setError(next.error || "Could not save these details."); return; } setData(next); setSaved(true); track("stay_travel_saved", { direction, mode }); } finally { setBusy(false); } }
  return <section className={styles.card}><CardHeader step={direction === "arrival" ? "2" : "3"} title={title} summary={summary} open={open} toggle={toggle} />{open && <form className={styles.form} onSubmit={save}>
    <label className={styles.label}>How are you {direction === "arrival" ? "getting here" : "heading home"}?<select className={styles.select} value={mode} onChange={(e) => { setMode(e.target.value as TravelMode); setSaved(false); }}>{MODES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    {(mode === "flight" || mode === "bus") && <label className={styles.label}>{direction === "arrival" ? "Arrival" : "Departure"} date and time {mode === "flight" ? (direction === "arrival" ? "at CVG" : "from CVG") : "in Cincinnati"}<input className={styles.input} type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} /></label>}
    {mode === "flight" && <><div className={styles.twoCol}><label className={styles.label}>Airline<select className={styles.select} value={airline} onChange={(e) => setAirline(e.target.value)}><option value="">Choose…</option>{AIRLINES.map(([code, name]) => <option key={code} value={code}>{code === "OTHER" ? name : `${code} — ${name}`}</option>)}</select></label><label className={styles.label}>Flight number (optional)<input className={styles.input} inputMode="numeric" pattern="[0-9]{1,4}" value={flight} onChange={(e) => setFlight(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1487" /></label></div>{airline === "OTHER" && <label className={styles.label}>Airline name<input className={styles.input} value={otherAirline} onChange={(e) => setOtherAirline(e.target.value)} /></label>}<p className={styles.hint}>Enter digits only for the flight number—we already have the airline code.</p></>}
    {mode === "drive" && <div className={styles.twoCol}><label className={styles.label}>{direction === "arrival" ? "Arrival" : "Departure"} date<input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label className={styles.label}>Rough time<select className={styles.select} value={period} onChange={(e) => setPeriod(e.target.value as TimePeriod)}><option value="">Choose…</option>{PERIODS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>}
    {mode === "other" && <p className={styles.hint}>No additional details needed right now. You can update this later.</p>}{error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button className={styles.save} disabled={busy || previewMode}>{previewMode ? "Preview only" : busy ? "Saving…" : `Save ${direction}`}</button>{saved && <span className={styles.saved}>Saved for your group</span>}</div>
  </form>}</section>;
}

function summarizeLeg(leg: Leg, direction: "arrival" | "departure") { const label = MODES.find(([value]) => value === leg.mode)?.[1] ?? leg.mode; if (leg.mode === "undecided") return "Not decided yet"; if (leg.mode === "other") return "Other travel plans"; if (leg.mode === "drive") return `${label} · ${leg.travelDate} ${leg.timePeriod ?? ""}`; const when = leg.localDateTime ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(`${leg.localDateTime}:00Z`)) : ""; const flight = leg.mode === "flight" ? ` · ${leg.airlineCode === "OTHER" ? leg.otherAirlineName : leg.airlineCode}${leg.flightNumber ? ` ${leg.flightNumber}` : ""}` : ""; return `${label}${flight} · ${direction === "arrival" ? "arrives" : "departs"} ${when}`; }

function HotelMatch({ names }: { names: string[] }) { const list = new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(names); return <p className={styles.match}><strong>{list}</strong> {names.length === 1 ? "is" : "are"} staying at your hotel too—you can coordinate Ubers! If you don&apos;t know them, please contact Nickhil or Nikki to introduce you.</p>; }

function getChronologyWarning(legs: Leg[]) {
  const arrival = legs.find((leg) => leg.direction === "arrival");
  const departure = legs.find((leg) => leg.direction === "departure");
  if (!arrival || !departure) return null;
  const arrivalDate = arrival.localDateTime?.slice(0, 10) || arrival.travelDate;
  const departureDate = departure.localDateTime?.slice(0, 10) || departure.travelDate;
  if (!arrivalDate || !departureDate) return null;
  if (departureDate < arrivalDate) return "Your departure is before your arrival. Double-check the dates in your travel plan.";
  if (departureDate > arrivalDate) return null;
  if (arrival.localDateTime && departure.localDateTime && departure.localDateTime < arrival.localDateTime) {
    return "Your departure time is before your arrival time. Double-check the times in your travel plan.";
  }
  if (arrival.mode === "drive" && departure.mode === "drive" && arrival.timePeriod && departure.timePeriod) {
    const rank: Record<TimePeriod, number> = { morning: 0, afternoon: 1, evening: 2, night: 3 };
    if (rank[departure.timePeriod] < rank[arrival.timePeriod]) return "Your departure time of day is before your arrival time of day. Double-check your travel plan.";
  }
  return null;
}

function RecommendationLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className={styles.externalArrow} aria-hidden="true">↗</span></a>;
}

function Recommendations() {
  return <section className={styles.recommendations}>
    <h2>Places we recommend</h2>
    <p className={styles.recommendationIntro}>A few Cincinnati classics Nickhil and Nikki love, plus favorite downtown spots for your free time.</p>

    <h3>Cincy classic food spots</h3>
    <div className={styles.recommendationGrid}>
      <article className={styles.recommendation}>
        <h4><RecommendationLink href="https://maps.app.goo.gl/L3v7c8SCf6BDyYNT6">Graeter&apos;s Ice Cream</RecommendationLink></h4>
        <p>A Cincinnati must. Any location is a great choice.</p>
      </article>
      <article className={styles.recommendation}>
        <h4><RecommendationLink href="https://maps.app.goo.gl/NGFBsfXY5C8S9CF86">Skyline Chili</RecommendationLink></h4>
        <p>Visit any location near where you&apos;re staying. The new downtown flagship is on Fountain Square and even has a bar. Chicken chili and black beans are available for guests who don&apos;t eat beef.</p>
      </article>
      <article className={styles.recommendation}>
        <h4><RecommendationLink href="https://maps.app.goo.gl/QV1vW2kFKbmvLZy56">Mikey&apos;s Late Night Slice</RecommendationLink></h4>
        <p>Technically a Columbus classic, but they have a location in downtown Cincy—our pick for the best thin pizza by the slice.</p>
      </article>
    </div>

    <h3>Downtown bars</h3>
    <div className={`${styles.recommendationGrid} ${styles.barGrid}`}>
      <article className={styles.recommendation}>
        <h4><RecommendationLink href="https://maps.app.goo.gl/Se3ApNdUsJJ6kABM6">Revel OTR Urban Winery</RecommendationLink></h4>
        <p>Incredible in-house wine blends anytime and a popping dance bar later at night. Ask if Matt is working—if he is, tell him you&apos;re friends with Lulu&apos;s daughter Nikki and her fiancé Nick. He&apos;ll hook you up :)</p>
      </article>
      <article className={styles.recommendation}>
        <h4><RecommendationLink href="https://maps.app.goo.gl/AHCdAKqeyoByYCio6">Bar Saeso</RecommendationLink></h4>
        <p>An intimate, hip cocktail bar downtown.</p>
      </article>
    </div>

    <article className={`${styles.recommendation} ${styles.festival}`}>
      <h3><RecommendationLink href="https://oktoberfestzinzinnati.com/festival-information/">Oktoberfest Zinzinnati</RecommendationLink></h3>
      <p>At Sawyer Point on the riverfront, this is known as the largest Oktoberfest celebration outside Germany—and no ticket is needed to attend. We heavily recommend going for beers on Saturday afternoon after the engagement ceremony, especially if you&apos;re staying downtown.</p>
    </article>
  </section>;
}
