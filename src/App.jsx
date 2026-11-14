import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

const films = [
  {
    id: 'dune-part-two',
    title: 'Дюна: Часть вторая',
    original: 'Dune: Part Two',
    year: '2024',
    age: '12+',
    duration: '2 ч 46 мин',
    genre: 'Фантастика · Драма',
    director: 'Дени Вильнёв',
    lead: true,
    accent: 'sand',
    tagline: 'Да здравствуют борцы.',
    description:
      'Пол Атрейдес объединяется с Чани и фрименами, готовясь отомстить заговорщикам, уничтожившим его семью. Ему предстоит выбрать между любовью всей жизни и судьбой известной вселенной.',
    sessions: ['18:10', '19:30', '21:40'],
  },
  {
    id: 'arrival',
    title: 'Прибытие',
    original: 'Arrival',
    year: '2016',
    age: '16+',
    duration: '1 ч 56 мин',
    genre: 'Фантастика · Драма',
    director: 'Дени Вильнёв',
    accent: 'mist',
    tagline: 'Почему они здесь?',
    description:
      'Лингвист Луиза Бэнкс пытается найти общий язык с таинственными гостями и понять цель их появления на Земле.',
    sessions: ['17:20', '20:10'],
  },
  {
    id: 'spirited-away',
    title: 'Унесённые призраками',
    original: '千と千尋の神隠し',
    year: '2001',
    age: '6+',
    duration: '2 ч 05 мин',
    genre: 'Анимация · Фэнтези',
    director: 'Хаяо Миядзаки',
    accent: 'ink',
    tagline: 'Не забывай своё имя.',
    description:
      'Тихая девочка Тихиро оказывается в мире духов, где ей придётся проявить отвагу и найти дорогу домой.',
    sessions: ['16:00', '18:40'],
  },
];

const showDates = [
  { short: 'Сегодня', day: '14', month: 'ноя', value: '14.11.2026' },
  { short: 'Вс', day: '15', month: 'ноя', value: '15.11.2026' },
  { short: 'Пн', day: '16', month: 'ноя', value: '16.11.2026' },
  { short: 'Вт', day: '17', month: 'ноя', value: '17.11.2026' },
];

const defaultOrder = {
  filmId: 'dune-part-two',
  guest: 'Ева Трубникова',
  date: '14.11.2026',
  time: '19:30',
  hall: 3,
  row: 1,
  seat: 1,
  ticketNumber: 'EH-0008427',
};

const occupiedSeats = new Set(['2-3', '2-4', '3-6', '4-2', '4-8', '5-5', '5-6']);

function Logo({ compact = false }) {
  return (
    <span className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="EHI! CINEMA">
      <strong>EHI!</strong>
      <span>CINEMA</span>
    </span>
  );
}

function Cat({ small = false }) {
  return (
    <svg className={`cat ${small ? 'cat--small' : ''}`} viewBox="0 0 220 150" role="img" aria-label="Чёрный кот EHI">
      <path d="M154 78c29-37 14-71-17-60 19 4 24 23 7 45" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" />
      <path d="M72 58 54 30 49 67m77-7 19-30 5 46" fill="currentColor" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <ellipse cx="101" cy="90" rx="53" ry="46" fill="currentColor" />
      <ellipse cx="147" cy="111" rx="54" ry="30" fill="currentColor" />
      <ellipse cx="79" cy="84" rx="8" ry="11" fill="#f4f1e9" />
      <ellipse cx="119" cy="84" rx="8" ry="11" fill="#f4f1e9" />
      <circle cx="81" cy="86" r="3" fill="#111" />
      <circle cx="121" cy="86" r="3" fill="#111" />
      <path d="m96 99 8 0-4 6Z" fill="#f4f1e9" />
      <path d="M96 108c3 4 7 4 10 0" fill="none" stroke="#f4f1e9" strokeWidth="2" strokeLinecap="round" />
      <path d="M52 96 13 86m40 21-44 3m48 8-35 16m119-14 43 13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M103 124c-7 11-20 15-34 11m70-13c4 12 16 16 30 14" fill="none" stroke="#f4f1e9" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Icon({ name }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    back: <><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></>,
    ticket: <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z"/><path d="M13 6v12"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function CinemaLayout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="cinema-shell">
      <header className="site-header">
        <Link to="/cinema" className="brand-link"><Logo /></Link>
        <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Открыть меню">
          <Icon name={open ? 'close' : 'menu'} />
        </button>
        <nav className={open ? 'nav nav--open' : 'nav'} aria-label="Основная навигация">
          <NavLink to="/cinema" end>Афиша</NavLink>
          <NavLink to="/cinema/tickets">Мои билеты</NavLink>
          <NavLink to="/cinema/about">О кинотеатре</NavLink>
        </nav>
        <Link to="/cinema/tickets" className="header-ticket"><Icon name="ticket" /> <span>Мои билеты</span></Link>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div><Logo compact /><p>Кино только для своих.</p></div>
        <div className="footer-meta"><span>ул. Кинематографическая, 12</span><span>14 ноября 2026</span></div>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <main className="home-page">
      <div className="home-mark">EHI!</div>
      <div className="home-copy">
        <p>Здесь однажды появятся наши фотографии.</p>
        <h1>А пока<br />идём в кино?</h1>
        <Link className="button button--dark" to="/cinema">Открыть EHI! CINEMA <Icon name="arrow" /></Link>
      </div>
      <div className="home-cat"><Cat /></div>
      <span className="home-note">Личное пространство · 2026</span>
    </main>
  );
}

function DateStrip({ selected, onChange }) {
  return (
    <div className="date-strip" aria-label="Выбор даты">
      {showDates.map((date) => (
        <button key={date.value} className={selected === date.value ? 'date-chip date-chip--active' : 'date-chip'} onClick={() => onChange(date.value)}>
          <span>{date.short}</span><strong>{date.day}</strong><small>{date.month}</small>
        </button>
      ))}
    </div>
  );
}

function FilmPoster({ film, large = false }) {
  return (
    <div className={`poster poster--${film.accent} ${large ? 'poster--large' : ''}`} aria-label={`Постер фильма «${film.title}»`}>
      <span className="poster-stars">✦　·　✦</span>
      <span className="poster-eyebrow">EHI! presentation</span>
      <strong>{film.title.split(':')[0]}</strong>
      {film.title.includes(':') && <em>{film.title.split(':')[1]}</em>}
      <span className="poster-foot">{film.original} · {film.year}</span>
    </div>
  );
}

function FilmCard({ film, date }) {
  return (
    <article className="film-card">
      <Link to={`/cinema/film/${film.id}`} className="poster-link"><FilmPoster film={film} /></Link>
      <div className="film-card__body">
        <div className="film-card__top"><span>{film.genre}</span><b>{film.age}</b></div>
        <h3><Link to={`/cinema/film/${film.id}`}>{film.title}</Link></h3>
        <p>{film.duration} · {film.director}</p>
        <div className="sessions">
          {film.sessions.map((time, index) => (
            <Link key={time} className={index === 0 ? 'session session--primary' : 'session'} to={`/cinema/seats?film=${film.id}&date=${date}&time=${time}`}>{time}</Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function CinemaHome() {
  const [date, setDate] = useState('14.11.2026');
  return (
    <CinemaLayout>
      <section className="hero">
        <div className="hero-kicker"><span>Персональный кинотеатр</span><span>Зал на 40 мест</span></div>
        <div className="hero-copy">
          <h1>Большое кино.<br /><i>Очень</i> маленький зал.</h1>
          <p>Выбираем любимые фильмы, зовём любимых людей и смотрим без рекламы. Сегодня в главной роли — вы.</p>
          <a className="button button--light" href="#schedule">Смотреть афишу <Icon name="arrow" /></a>
        </div>
        <div className="hero-art">
          <Cat />
          <div className="hero-badge"><strong>1</strong><span>экран</span></div>
          <div className="hero-badge hero-badge--second"><strong>40</strong><span>мест</span></div>
        </div>
        <div className="hero-marquee"><span>EHI! CINEMA ✦ СЕГОДНЯ В КИНО ✦ EHI! CINEMA ✦ СЕГОДНЯ В КИНО ✦</span></div>
      </section>

      <section className="schedule section" id="schedule">
        <div className="section-heading">
          <div><span className="eyebrow">Афиша</span><h2>Выберите сеанс</h2></div>
          <p>Один уютный зал, идеальный звук и никакой спешки.</p>
        </div>
        <DateStrip selected={date} onChange={setDate} />
        <div className="film-grid">{films.map((film) => <FilmCard film={film} date={date} key={film.id} />)}</div>
      </section>

      <section className="manifesto section">
        <div className="manifesto-cat"><Cat /></div>
        <div><span className="eyebrow">Наши правила</span><h2>Можно мурчать.<br />Нельзя спойлерить.</h2></div>
        <ol>
          <li><strong>01</strong><span>Приходите за 10 минут — успеем налить чай.</span></li>
          <li><strong>02</strong><span>Телефоны на беззвучный. Переживания — на полную.</span></li>
          <li><strong>03</strong><span>Билет персональный, но пледами можно делиться.</span></li>
        </ol>
      </section>
    </CinemaLayout>
  );
}

function FilmPage() {
  const { filmId } = useParams();
  const film = films.find((item) => item.id === filmId) || films[0];
  const [date, setDate] = useState('14.11.2026');
  return (
    <CinemaLayout>
      <section className="film-hero section">
        <Link className="back-link" to="/cinema"><Icon name="back" /> К афише</Link>
        <div className="film-detail-grid">
          <FilmPoster film={film} large />
          <div className="film-detail-copy">
            <div className="film-meta-line"><span>{film.year}</span><span>{film.age}</span><span>{film.duration}</span></div>
            <h1>{film.title}</h1>
            <p className="film-tagline">«{film.tagline}»</p>
            <p className="film-description">{film.description}</p>
            <dl><div><dt>Режиссёр</dt><dd>{film.director}</dd></div><div><dt>Жанр</dt><dd>{film.genre}</dd></div></dl>
          </div>
        </div>
      </section>
      <section className="pick-session section">
        <div className="section-heading"><div><span className="eyebrow">Ближайшие сеансы</span><h2>Когда смотрим?</h2></div><p>Зал № 3 · русский язык</p></div>
        <DateStrip selected={date} onChange={setDate} />
        <div className="big-sessions">
          {film.sessions.map((time, index) => <Link key={time} to={`/cinema/seats?film=${film.id}&date=${date}&time=${time}`}><span>{time}</span><small>{index === 0 ? 'Осталось 12 мест' : 'Мест достаточно'}</small><Icon name="arrow" /></Link>)}
        </div>
      </section>
    </CinemaLayout>
  );
}

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function SeatPage() {
  const query = useQuery();
  const navigate = useNavigate();
  const film = films.find((item) => item.id === query.get('film')) || films[0];
  const date = query.get('date') || defaultOrder.date;
  const time = query.get('time') || defaultOrder.time;
  const [selected, setSelected] = useState({ row: 1, seat: 1 });
  const seats = useMemo(() => Array.from({ length: 5 }, (_, rowIndex) => Array.from({ length: 8 }, (_, seatIndex) => ({ row: rowIndex + 1, seat: seatIndex + 1 }))), []);

  const continueOrder = () => {
    sessionStorage.setItem('ehi-order', JSON.stringify({ ...defaultOrder, filmId: film.id, date, time, ...selected }));
    navigate('/cinema/checkout');
  };

  return (
    <CinemaLayout>
      <section className="seat-page section">
        <Link className="back-link" to={`/cinema/film/${film.id}`}><Icon name="back" /> Назад к фильму</Link>
        <div className="seat-heading"><div><span className="eyebrow">Шаг 1 из 2</span><h1>Выберите место</h1></div><div className="mini-session"><strong>{film.title}</strong><span>{date} · {time} · Зал 3</span></div></div>
        <div className="seat-layout">
          <div className="hall">
            <div className="screen"><span>Экран</span></div>
            <div className="seat-map">
              {seats.map((row) => <div className="seat-row" key={row[0].row}><span className="row-number">{row[0].row}</span>{row.map(({ row: rowNo, seat }) => {
                const key = `${rowNo}-${seat}`;
                const isSelected = selected.row === rowNo && selected.seat === seat;
                const occupied = occupiedSeats.has(key);
                return <button key={key} className={`seat ${isSelected ? 'seat--selected' : ''} ${occupied ? 'seat--occupied' : ''}`} disabled={occupied} onClick={() => setSelected({ row: rowNo, seat })} aria-label={`Ряд ${rowNo}, место ${seat}${occupied ? ', занято' : ''}`}>{seat}</button>;
              })}<span className="row-number row-number--right">{row[0].row}</span></div>)}
            </div>
            <div className="seat-legend"><span><i className="legend-free" />Свободно</span><span><i className="legend-selected" />Выбрано</span><span><i className="legend-occupied" />Занято</span></div>
          </div>
          <aside className="order-summary">
            <span className="eyebrow">Ваш выбор</span>
            <h2>{film.title}</h2>
            <div className="summary-pair"><span>Дата и время</span><strong>{date} · {time}</strong></div>
            <div className="summary-pair"><span>Зал</span><strong>№ 3</strong></div>
            <div className="selected-seat"><span>Ряд <strong>{selected.row}</strong></span><span>Место <strong>{selected.seat}</strong></span></div>
            <div className="summary-total"><span>Билет</span><strong>По приглашению</strong></div>
            <button className="button button--dark button--wide" onClick={continueOrder}>Продолжить <Icon name="arrow" /></button>
            <small>Оплата не требуется — это персональное приглашение.</small>
          </aside>
        </div>
      </section>
    </CinemaLayout>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const [guest, setGuest] = useState(defaultOrder.guest);
  const [email, setEmail] = useState('');
  const order = useMemo(() => {
    try { return { ...defaultOrder, ...JSON.parse(sessionStorage.getItem('ehi-order')) }; } catch { return defaultOrder; }
  }, []);
  const film = films.find((item) => item.id === order.filmId) || films[0];

  const issueTicket = (event) => {
    event.preventDefault();
    const ticket = { ...order, guest: guest.trim() || defaultOrder.guest, createdAt: new Date().toISOString() };
    localStorage.setItem('ehi-ticket', JSON.stringify(ticket));
    navigate('/cinema/ticket');
  };

  return (
    <CinemaLayout>
      <section className="checkout-page section">
        <Link className="back-link" to={`/cinema/seats?film=${film.id}&date=${order.date}&time=${order.time}`}><Icon name="back" /> Назад к местам</Link>
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={issueTicket}>
            <span className="eyebrow">Шаг 2 из 2</span><h1>Кто идёт в кино?</h1><p>Имя появится на персональном билете. Всё остальное уже готово.</p>
            <label>Имя гостя<input value={guest} onChange={(event) => setGuest(event.target.value)} required autoComplete="name" /></label>
            <label>Почта <span>необязательно</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Для себя, без рассылок" autoComplete="email" /></label>
            <label className="check-label"><input type="checkbox" required defaultChecked /><span><Icon name="check" /></span>Я запомню дату и не опоздаю к началу</label>
            <button className="button button--dark button--wide" type="submit">Оформить билет <Icon name="ticket" /></button>
            <small>Денег и данных карты не потребуется.</small>
          </form>
          <aside className="checkout-summary">
            <FilmPoster film={film} />
            <h2>{film.title}</h2>
            <div><span><Icon name="clock" />{order.date} · {order.time}</span><span><Icon name="pin" />Зал 3 · Ряд {order.row} · Место {order.seat}</span></div>
            <p><strong>Итого</strong><b>По приглашению</b></p>
          </aside>
        </div>
      </section>
    </CinemaLayout>
  );
}

function Barcode() {
  return <div className="barcode" aria-label="Штрихкод билета">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ width: `${i % 4 === 0 ? 4 : i % 3 === 0 ? 2 : 1}px` }} />)}</div>;
}

function Ticket({ ticket, compact = false }) {
  const film = films.find((item) => item.id === ticket.filmId) || films[0];
  return (
    <article className={`ticket ${compact ? 'ticket--compact' : ''}`}>
      <div className="ticket-cat"><Cat small /><Logo /></div>
      <div className="ticket-main">
        <div className="ticket-venue"><span>Кинотеатр: <strong>EHI! CINEMA</strong></span><span><Icon name="pin" /> ул. Кинематографическая, 12</span></div>
        <span className="ticket-label">Гость:</span><h2>{ticket.guest}</h2>
        <div className="ticket-film"><span>Фильм:</span><strong>{film.title}</strong><b>{film.age}</b></div>
        <div className="ticket-data"><span><small>Дата</small><strong>{ticket.date}</strong></span><span><small>Время</small><strong>{ticket.time}</strong></span><span><small>Зал</small><strong>{ticket.hall}</strong></span></div>
        <div className="ticket-seats"><span>Ряд: <strong>{ticket.row}</strong></span><span>Место: <strong>{ticket.seat}</strong></span><span>Билет: <strong>№ {ticket.ticketNumber}</strong></span></div>
      </div>
      <div className="ticket-stub"><Logo compact /><div className="fake-qr"><span>EH!</span></div><strong>№ {ticket.ticketNumber}</strong><Barcode /></div>
    </article>
  );
}

function TicketPage() {
  const ticket = useMemo(() => {
    try { return { ...defaultOrder, ...JSON.parse(localStorage.getItem('ehi-ticket')) }; } catch { return defaultOrder; }
  }, []);
  return (
    <CinemaLayout>
      <section className="ticket-page section">
        <div className="success-mark"><Icon name="check" /></div><span className="eyebrow">Билет готов</span><h1>Увидимся в кино, {ticket.guest.split(' ')[0]}!</h1><p>Сохраните билет или просто откройте раздел «Мои билеты» перед сеансом.</p>
        <div className="ticket-scroll"><Ticket ticket={ticket} /></div>
        <div className="ticket-actions"><Link className="button button--dark" to="/cinema/tickets">В мои билеты <Icon name="arrow" /></Link><Link className="button button--outline" to="/cinema">Вернуться в афишу</Link></div>
      </section>
    </CinemaLayout>
  );
}

function TicketsPage() {
  const ticket = useMemo(() => {
    try { return { ...defaultOrder, ...JSON.parse(localStorage.getItem('ehi-ticket')) }; } catch { return defaultOrder; }
  }, []);
  return (
    <CinemaLayout>
      <section className="my-tickets section">
        <div className="section-heading"><div><span className="eyebrow">Личный кабинет</span><h1>Мои билеты</h1></div><p>Всё важное — в одном месте. Даже если билет всего один.</p></div>
        <div className="ticket-scroll"><Ticket ticket={ticket} compact /></div>
        <div className="ticket-info"><span><Icon name="clock" /><b>До сеанса</b><strong>Сегодня · 19:30</strong></span><span><Icon name="pin" /><b>Адрес</b><strong>ул. Кинематографическая, 12</strong></span><span><Icon name="ticket" /><b>Статус</b><strong>Готов к показу</strong></span></div>
      </section>
    </CinemaLayout>
  );
}

function AboutPage() {
  return (
    <CinemaLayout>
      <section className="about-hero section"><div><span className="eyebrow">О кинотеатре</span><h1>Место, где<br />кино становится<br /><i>личным.</i></h1></div><div className="about-cat"><Cat /></div></section>
      <section className="about-grid section"><div className="about-big-copy">EHI! CINEMA — вымышленный персональный кинотеатр для невымышленных эмоций. Здесь всего один зал и ровно столько гостей, сколько хочется видеть рядом.</div><div className="about-facts"><div><strong>01</strong><h3>Без рекламы</h3><p>Только короткий свет, тишина и фильм.</p></div><div><strong>02</strong><h3>По приглашению</h3><p>Никакой кассы: каждый билет уже особенный.</p></div><div><strong>03</strong><h3>С котом</h3><p>Он следит за порядком и иногда засыпает первым.</p></div></div></section>
    </CinemaLayout>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    const timeout = window.setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cinema" element={<CinemaHome />} />
        <Route path="/cinema/film/:filmId" element={<FilmPage />} />
        <Route path="/cinema/seats" element={<SeatPage />} />
        <Route path="/cinema/checkout" element={<CheckoutPage />} />
        <Route path="/cinema/ticket" element={<TicketPage />} />
        <Route path="/cinema/tickets" element={<TicketsPage />} />
        <Route path="/cinema/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/cinema" replace />} />
      </Routes>
    </>
  );
}
