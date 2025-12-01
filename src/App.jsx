import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { AnimatePresence, motion } from "framer-motion";
import "./styles.css";

function flagUrlFromCode(code, size = 80) {
  const c = (code || "").trim().toLowerCase();
  if (c.length !== 2) return "";
  return `https://flagcdn.com/w${size}/${c}.png`;
}

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function Card({ title, children, right }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h3>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function Auth() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  async function login() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setMsg(error.message);
  }

  async function register() {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) return setMsg(error.message);
    setMsg("REGISTRO OK. SI TU PROYECTO PIDE CONFIRMACION POR EMAIL, REVISA TU CORREO.");
  }

  return (
    <motion.div className="authWrap" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="topBar">
        <div>
          <h1>¿Infieles?</h1>
          <p className="muted">Aviso: al enviar un nombre, se guarda el correo del creador. Si la persona registrada solicita saber quién la agregó, se podrá compartir ese correo.
            
          </p>
          <p className="muted">Inicia sesion para ver y agregar.</p>
          <p className="muted">Esta pagina la hizo un infiel :(</p>
        </div>
      </div>

      <Card
        title="ACCESO"
        right={
          <div className="segmented">
            <button className={mode === "login" ? "seg active" : "seg"} onClick={() => setMode("login")}>
              LOGIN
            </button>
            <button className={mode === "register" ? "seg active" : "seg"} onClick={() => setMode("register")}>
              REGISTRO
            </button>
          </div>
        }
      >
        <div className="row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="CORREO" />
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="CONTRASENA" type="password" />
          <button className="btn" onClick={mode === "login" ? login : register}>
            {mode === "login" ? "ENTRAR" : "CREAR CUENTA"}
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </Card>
    </motion.div>
  );
}

function CountryGrid({ countries, selectedId, onSelect, counts = {} }) {
  if (!countries.length) return <p className="muted">NO HAY PAISES.</p>;

  return (
    <div className="grid">
      {countries.map((c) => {
        const active = c.id === selectedId;
        const code = (c.code || "").toUpperCase();
        const total = counts[c.id] ?? 0;

        return (
          <button
            key={c.id}
            className={active ? "countryCard active" : "countryCard"}
            onClick={() => onSelect(c.id)}
            type="button"
          >
            <div className="countryTop">
              <img
                className="flagImgBig"
                src={flagUrlFromCode(code, 80)}
                alt={`BANDERA ${code}`}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="countryBadge">{code}</span>
            </div>

            <div className="countryText">
              <div className="countryName">{(c.name || "").toUpperCase()}</div>
              <div className="countryMeta">{total} NOMBRE(S)</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NameCards({ items, emptyText, defaultCountryCode = "" }) {
  if (!items?.length) return <p className="muted">{emptyText}</p>;

  return (
    <div className="nameGrid">
      {items.map((x) => {
        const code = (x.country_code || defaultCountryCode || "").toUpperCase();
        const url = code.length === 2 ? flagUrlFromCode(code, 48) : "";

        return (
          <div key={x.id} className="nameCard">
            <div className="nameCardLeft">
              {url ? (
                <img className="flagImg" src={url} alt={`BANDERA ${code}`} loading="lazy" />
              ) : (
                <div className="flagPlaceholder">🌍</div>
              )}
            </div>

            <div className="nameCardBody">
              <div className="listTitle">{(x.name || "").toUpperCase()}</div>
              {x.description ? <div className="listDesc">{(x.description || "").toUpperCase()}</div> : null}
              {x.country_label ? (
                <div className="listMeta">
                  <Pill>{x.country_label}</Pill>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  const [countries, setCountries] = useState([]);
  const [countryId, setCountryId] = useState("");
  const [countryCounts, setCountryCounts] = useState({});

  const [tab, setTab] = useState("pais"); // pais | general

  const [genderFilterCountry, setGenderFilterCountry] = useState("TODOS");
  const [genderFilterGlobal, setGenderFilterGlobal] = useState("TODOS");

  const [countryQuery, setCountryQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const dCountryQuery = useDebounced(countryQuery, 250);
  const dGlobalQuery = useDebounced(globalQuery, 250);

  const [countryNames, setCountryNames] = useState([]);
  const [globalNames, setGlobalNames] = useState([]);

  // form
  const [newCountryId, setNewCountryId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [msg, setMsg] = useState("");
  const [newGender, setNewGender] = useState("HOMBRE");

  function toUpperStrict(s) {
    return (s || "").toUpperCase();
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadCountries() {
    const { data, error } = await supabase
      .from("countries")
      .select("id,name,code")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    setCountries(data || []);
    if (!countryId && data?.length) setCountryId(data[0].id);
    if (!newCountryId && data?.length) setNewCountryId(data[0].id);
  }

  async function loadCountryCounts() {
    const { data, error } = await supabase
      .from("country_name_counts")
      .select("country_id,total");

    if (error) throw error;

    const counts = {};
    for (const r of data || []) counts[r.country_id] = r.total;
    setCountryCounts(counts);
  }

  async function loadNamesByCountry(id, q) {
    if (!id) return setCountryNames([]);

    let query = supabase
      .from("names")
      .select("id,name,description")
      .eq("country_id", id)
      .order("name", { ascending: true })
      .limit(200);

    const qq = (q || "").trim();
    if (qq) query = query.or(`name.ilike.%${qq}%,description.ilike.%${qq}%`);

    const { data, error } = await query;
    if (error) throw error;

    setCountryNames(data || []);
  }

  async function loadGlobalNames(q) {
    const qq = (q || "").trim();
    if (qq.length < 2) {
      setGlobalNames([]);
      return;
    }

    const { data, error } = await supabase
      .from("names")
      .select("id,name,description,countries(name,code)")
      .or(`name.ilike.%${qq}%,description.ilike.%${qq}%`)
      .order("name", { ascending: true })
      .limit(200);

    if (error) throw error;

    const mapped = (data || []).map((x) => ({
      id: x.id,
      name: x.name,
      description: x.description,
      country_code: x.countries?.code || "",
      country_label: x.countries?.name
        ? `${(x.countries.name || "").toUpperCase()} (${(x.countries.code || "").toUpperCase()})`
        : "",
    }));

    setGlobalNames(mapped);
  }

  useEffect(() => {
    if (!session) return;

    (async () => {
      await loadCountries();
      await loadCountryCounts();
    })().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) return;
    loadNamesByCountry(countryId, dCountryQuery).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, countryId, dCountryQuery]);

  useEffect(() => {
    if (!session) return;
    loadGlobalNames(dGlobalQuery).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, dGlobalQuery]);

  const selectedCountry = useMemo(() => countries.find((c) => c.id === countryId), [countries, countryId]);

async function addName() {
  setMsg("");

  const cid = newCountryId || countryId;
  if (!cid) return setMsg("SELECCIONA UN PAIS.");

  const name = newName.trim().replace(/\s+/g, " ");
  const desc = newDesc.trim().replace(/\s+/g, " ");

  const nameUp = toUpperStrict(name);
  const descUp = toUpperStrict(desc);

  if (nameUp.length < 2 || nameUp.length > 60) return setMsg("NOMBRE: 2 A 60 CARACTERES.");
  if (descUp.length > 200) return setMsg("DESCRIPCION: MAX 200 CARACTERES.");

  const { error } = await supabase.from("names").insert({
    country_id: cid,
    name: nameUp,
    description: descUp || null,
    gender: newGender,
    created_by: session.user.id,
  });

  if (error) {
    const raw = (error.message || "").toUpperCase();

    if (raw.includes("NOMBRE RESTRINGIDO")) {
      return setMsg("❌ Amor yo se que aun me amas");
    }

    if (
      raw.includes("DUPLICATE KEY") ||
      raw.includes("UNIQUE CONSTRAINT") ||
      raw.includes("NAMES_COUNTRY_NAME_UNIQUE_IDX")
    ) {
      return setMsg("❌ ESE NOMBRE YA EXISTE EN ESE PAIS. PRUEBA CON OTRO.");
    }

    return setMsg(`❌ ERROR: ${error.message}`);
  }

  setNewName("");
  setNewDesc("");
  setMsg("GUARDADO ✅");

  await loadCountryCounts();

  if (countryId === cid) {
    await loadNamesByCountry(countryId, dCountryQuery, genderFilterCountry);
  } else {
    setCountryId(cid);
    setTab("pais");
  }
}


  async function logout() {
    await supabase.auth.signOut();
  }

  if (!session) return <Auth />;

  return (
    <div className="wrap">
      <div className="topBar">
        <div>
          <h1>¿Infieles?</h1>
          <p className="muted">No difamen a nadie.</p>
        </div>
        <div className="right">
          <Pill>{session.user.email.toUpperCase()}</Pill>
          <button className="btn ghost" onClick={logout}>
            SALIR
          </button>
        </div>
      </div>

      <Card title="PAISES">
        <CountryGrid
          countries={countries}
          selectedId={countryId}
          counts={countryCounts}
          onSelect={(id) => {
            setCountryId(id);
            setTab("pais");
          }}
        />
      </Card>

      <div className="tabs">
        <button className={tab === "pais" ? "tab active" : "tab"} onClick={() => setTab("pais")}>
          POR PAIS
        </button>
        <button className={tab === "general" ? "tab active" : "tab"} onClick={() => setTab("general")}>
          FILTRO GENERAL
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "pais" ? (
          <motion.div key="pais" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Card title="LISTA + FILTRO DENTRO DEL PAIS">
              <div className="row">
                <div className="muted" style={{ minWidth: 240 }}>
                  PAIS: <b>{selectedCountry ? `${selectedCountry.name}`.toUpperCase() : "—"}</b>
                </div>
                <input
                  value={countryQuery}
                  onChange={(e) => setCountryQuery(toUpperStrict(e.target.value))}
                  placeholder="FILTRAR EN ESTE PAIS (NOMBRE O DESCRIPCION)"
                />
              </div>

              <NameCards
                items={countryNames}
                defaultCountryCode={selectedCountry?.code || ""}
                emptyText="NO HAY RESULTADOS."
              />
            </Card>

<Card title="AGREGAR - PAIS + NOMBRE + GENERO + DESCRIPCION">
  <div className="row">
    {/* SELECT PAIS */}
    <select value={newCountryId || ""} onChange={(e) => setNewCountryId(e.target.value)}>
      {countries.map((c) => (
        <option key={c.id} value={c.id}>
          {(c.name || "").toUpperCase()} ({(c.code || "").toUpperCase()})
        </option>
      ))}
    </select>

    {/* SELECT GENERO */}
    <select value={newGender} onChange={(e) => setNewGender(e.target.value)}>
      <option value="HOMBRE">HOMBRE</option>
      <option value="MUJER">MUJER</option>
    </select>

    {/* INPUT NOMBRE */}
    <input
      value={newName}
      onChange={(e) => setNewName(toUpperStrict(e.target.value))}
      placeholder="NOMBRE COMPLETO"
    />
  </div>

  <div className="row">
    <input
      value={newDesc}
      onChange={(e) => setNewDesc(toUpperStrict(e.target.value))}
      placeholder="DESCRIPCION (MAX 200)"
    />
    <button className="btn" onClick={addName}>ENVIAR</button>
  </div>

  {msg && <p className="muted">{msg}</p>}
</Card>

          </motion.div>
        ) : (
          <motion.div key="general" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Card title="FILTRO GENERAL (TODOS LOS PAISES)">
              <input
                value={globalQuery}
                onChange={(e) => setGlobalQuery(toUpperStrict(e.target.value))}
                placeholder="BUSCA EN TODOS LOS PAISES (MIN 2 LETRAS)..."
              />
              <p className="muted">MUESTRA RESULTADOS E INDICA EL PAIS.</p>
              <NameCards items={globalNames} emptyText="ESCRIBE 2+ LETRAS PARA BUSCAR." />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
