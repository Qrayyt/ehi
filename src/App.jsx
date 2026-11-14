import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatKisses } from './currency';

const films = [
  {
    id: 'mr-and-mrs-smith',
    title: 'Мистер и миссис Смит',
    original: 'Mr. & Mrs. Smith',
    year: '2005',
    type: 'Фильм',
    age: '16+',
    duration: '2 ч',
    genres: ['Боевик', 'Комедия', 'Мелодрама'],
    director: 'Даг Лайман',
    poster: '/posters/mr-and-mrs-smith.jpg',
    price: 5,
    bookingMode: 'personal-screening',
    description: 'Супруги Джон и Джейн Смит ведут спокойную семейную жизнь, скрывая друг от друга работу наёмных убийц. Всё меняется, когда им поручают устранить одну и ту же цель — а затем и друг друга.',
  },
  {
    id: 'interstellar',
    title: 'Интерстеллар',
    original: 'Interstellar',
    year: '2014',
    type: 'Фильм',
    age: '16+',
    duration: '2 ч 49 мин',
    genres: ['Фантастика', 'Драма', 'Приключения'],
    director: 'Кристофер Нолан',
    poster: '/posters/interstellar.jpg',
    price: 5,
    bookingMode: 'personal-screening',
    description: 'Земля становится всё менее пригодной для жизни. Бывший пилот Купер присоединяется к космической экспедиции, которая ищет новый дом для человечества по ту сторону червоточины.',
  },
  {
    id: 'breaking-bad',
    title: 'Во все тяжкие',
    original: 'Breaking Bad',
    year: '2008–2013',
    type: 'Сериал',
    age: '18+',
    duration: '5 сезонов · 62 серии',
    genres: ['Криминал', 'Драма', 'Триллер'],
    creator: 'Винс Гиллиган',
    poster: '/posters/breaking-bad.jpg',
    price: 5,
    bookingMode: 'episode-selection-coming-soon',
    description: 'Школьный учитель химии Уолтер Уайт узнаёт о тяжёлой болезни и решает обеспечить будущее семьи, начав варить метамфетамин вместе со своим бывшим учеником Джесси Пинкманом.',
  },
  {
    id: 'better-call-saul',
    title: 'Лучше звоните Солу',
    original: 'Better Call Saul',
    year: '2015–2022',
    type: 'Сериал',
    age: '18+',
    duration: '6 сезонов · 63 серии',
    genres: ['Криминал', 'Драма'],
    creator: 'Винс Гиллиган, Питер Гулд',
    poster: '/posters/better-call-saul.jpg',
    price: 5,
    bookingMode: 'episode-selection-coming-soon',
    description: 'История Джимми Макгилла — находчивого адвоката, который шаг за шагом превращается в Сола Гудмана и оказывается всё ближе к криминальному миру Альбукерке.',
  },
  {
    id: 'sherlock',
    title: 'Шерлок',
    original: 'Sherlock',
    year: '2010–2017',
    type: 'Сериал',
    age: '16+',
    duration: '4 сезона · 13 серий',
    genres: ['Детектив', 'Криминал', 'Драма'],
    creator: 'Марк Гэтисс, Стивен Моффат',
    poster: '/posters/sherlock.jpg',
    price: 5,
    bookingMode: 'episode-selection-coming-soon',
    description: 'Современная версия историй о Шерлоке Холмсе: блестящий сыщик и доктор Джон Ватсон расследуют сложные преступления в Лондоне XXI века.',
  },
  {
    id: 'desperate-housewives',
    title: 'Отчаянные домохозяйки',
    original: 'Desperate Housewives',
    year: '2004–2012',
    type: 'Сериал',
    age: '16+',
    duration: '8 сезонов · 180 серий',
    genres: ['Драма', 'Комедия', 'Детектив'],
    creator: 'Марк Черри',
    poster: '/posters/desperate-housewives.jpg',
    price: 5,
    bookingMode: 'episode-selection-coming-soon',
    description: 'За безупречными фасадами домов на Вистерия-Лейн скрываются тайны, романы, семейные кризисы и преступления, связывающие жизни нескольких подруг и соседок.',
  },
];

const sofaPlaces = [
  { id: 'left', label: 'Слева на диване', shortLabel: 'Слева' },
  { id: 'right', label: 'Справа на диване', shortLabel: 'Справа' },
];

const defaultBooking = {
  filmId: 'mr-and-mrs-smith',
  guest: 'Трубникова Ева',
  requestedDate: '2026-11-14',
  requestedTime: '19:30',
  room: 'Гостиная',
  seats: [sofaPlaces[0]],
  ticketNumber: 'EH-0008427',
  status: 'request',
};

function normalizeSeats(seats) {
  if (!Array.isArray(seats) || !seats.length) return [sofaPlaces[0]];
  return seats.map((seat, index) => {
    if (seat?.id && seat?.label) return seat;
    return sofaPlaces[index % sofaPlaces.length];
  }).filter((seat, index, list) => list.findIndex((item) => item.id === seat.id) === index);
}

function normalizeBooking(booking = {}) {
  return { ...defaultBooking, ...booking, seats: normalizeSeats(booking.seats || defaultBooking.seats) };
}

function makeTicketNumber() {
  return `EH-${String(Date.now()).slice(-7).padStart(7, '0')}`;
}

function placeNames(seats, short = false) {
  return normalizeSeats(seats).map((seat) => short ? seat.shortLabel : seat.label).join(' · ');
}

function seatNumbers(seats) {
  return normalizeSeats(seats).map((seat) => seat.id === 'right' ? '2' : '1').join(', ');
}

function formatDate(value) {
  if (!value) return 'По договорённости';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function Logo({ compact = false }) {
  return (
    <span className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="EHI! CINEMA">
      <strong>EHI!</strong><span>CINEMA</span>
    </span>
  );
}

function Icon({ name }) {
  const paths = {
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    back: <><path d="M19 12H5"/><path d="m10 7-5 5 5 5"/></>,
    ticket: <><path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z"/><path d="M13 6v12"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>,
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
        <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="Открыть меню" aria-expanded={open}><Icon name={open ? 'close' : 'menu'} /></button>
        <nav className={open ? 'nav nav--open' : 'nav'} aria-label="Основная навигация">
          <NavLink to="/cinema" end>Афиша</NavLink>
          <NavLink to="/cinema/tickets">Мои билеты</NavLink>
          <NavLink to="/cinema/about">О кинотеатре</NavLink>
        </nav>
        <Link to="/cinema/tickets" className="header-ticket"><Icon name="ticket" /> Мои билеты</Link>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div><Logo compact /><p>Домашний кинотеатр.</p></div>
        <div className="footer-meta"><span>ул. Кинематографическая, 12</span><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">Постеры: TMDB ↗</a></div>
      </footer>
    </div>
  );
}

function HomePage() {
  return (
    <main className="home-page">
      <Logo />
      <div><p>Здесь появятся наши фотографии.</p><h1>Пока можно<br />выбрать кино.</h1><Link className="button button--primary" to="/cinema">Открыть кинотеатр <Icon name="arrow" /></Link></div>
      <span>Личное пространство · 2026</span>
    </main>
  );
}

function Poster({ film, priority = false }) {
  const posterPath = `${import.meta.env.BASE_URL}${film.poster.replace(/^\/+/, '')}`;
  return <img className="poster" src={posterPath} alt={`Официальный постер «${film.title}»`} loading={priority ? 'eager' : 'lazy'} />;
}

function FilmCard({ film, index }) {
  return (
    <article className="film-card">
      <Link className="film-card__poster" to={`/cinema/film/${film.id}`}><Poster film={film} priority={index < 2} /><span>{film.type}</span></Link>
      <div className="film-card__body">
        <div className="film-card__meta"><span>{film.year}</span><span>{film.bookingMode === 'personal-screening' ? `${formatKisses(film.price, true)} за место` : 'Сезоны скоро'}</span></div>
        <h3><Link to={`/cinema/film/${film.id}`}>{film.title}</Link></h3>
        <p>{film.original}</p>
        <Link className="text-link" to={`/cinema/film/${film.id}`}>Подробнее <Icon name="arrow" /></Link>
      </div>
    </article>
  );
}

function CinemaHome() {
  const featured = films[0];
  return (
    <CinemaLayout>
      <section className="cinema-hero">
        <div className="cinema-hero__copy"><span className="eyebrow">EHI! CINEMA</span><h1>Домашний<br />кинотеатр.</h1><p>Выберите фильм, дату и место на диване. Настоящей оплаты нет: одно место стоит {formatKisses(5)}.</p><a className="button button--primary" href="#catalog">Открыть афишу <Icon name="arrow" /></a></div>
        <Link className="featured-poster" to={`/cinema/film/${featured.id}`}><Poster film={featured} priority /><div><span>В афише</span><strong>{featured.title}</strong><small>{formatKisses(featured.price, true)} за место</small></div></Link>
        <div className="hero-note"><span>1 комната</span><span>2 места</span><span>{formatKisses(5, true)} за место</span></div>
      </section>

      <section className="catalog section" id="catalog">
        <div className="section-heading"><div><span className="eyebrow">Афиша</span><h2>Фильмы и сериалы</h2></div><p>Фильмы уже можно бронировать. Выбор сезона и серии для сериалов добавим позже.</p></div>
        <div className="catalog-grid">{films.map((film, index) => <FilmCard film={film} index={index} key={film.id} />)}</div>
      </section>

      <section className="kiss-manifesto section">
        <div><span className="eyebrow">Оплата</span><h2>{formatKisses(5)}<br /><i>за место.</i></h2></div>
        <div className="kiss-price"><strong>5</strong><span>💋<br />за одно место</span></div>
        <p>Сайт не принимает деньги и не просит данные карты. Оплата поцелуями — при встрече.</p>
      </section>
    </CinemaLayout>
  );
}

function FilmPage() {
  const { filmId } = useParams();
  const navigate = useNavigate();
  const film = films.find((item) => item.id === filmId) || films[0];
  const [date, setDate] = useState(defaultBooking.requestedDate);
  const [time, setTime] = useState(defaultBooking.requestedTime);
  const canBook = film.bookingMode === 'personal-screening';

  function requestScreening(event) {
    event.preventDefault();
    navigate(`/cinema/seats?film=${film.id}&date=${date}&time=${time}`);
  }

  return (
    <CinemaLayout>
      <section className="film-detail section">
        <Link className="back-link" to="/cinema"><Icon name="back" /> К афише</Link>
        <div className="film-detail__grid">
          <div className="film-detail__poster"><Poster film={film} priority /><span>{film.type}</span></div>
          <div className="film-detail__copy">
            <div className="pills"><span>{film.year}</span><span>{film.age}</span><span>{film.duration}</span></div>
            <h1>{film.title}</h1><p className="original-title">{film.original}</p>
            <div className="genre-line">{film.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
            <p className="film-description">{film.description}</p>
            <dl><div><dt>{film.type === 'Фильм' ? 'Режиссёр' : 'Создатели'}</dt><dd>{film.director || film.creator}</dd></div><div><dt>Стоимость</dt><dd>{formatKisses(film.price, true)} за место</dd></div></dl>
          </div>
        </div>
      </section>

      <section className="booking-panel section">
        <div><span className="eyebrow">Бронирование</span><h2>{canBook ? 'Выберите дату и время' : 'Сериалы пока без бронирования'}</h2><p>{canBook ? 'После оформления отдельно подтвердим, подходит ли выбранное время.' : 'Сначала добавим выбор сезона и серии.'}</p></div>
        {canBook ? <form className="request-form" onSubmit={requestScreening}><label>Дата<input type="date" value={date} min="2026-11-14" onChange={(event) => setDate(event.target.value)} required /></label><label>Время<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label><button className="button button--primary" type="submit">Выбрать место <Icon name="arrow" /></button><small>Это предварительная бронь.</small></form> : <Link className="button button--outline" to="/cinema">Вернуться к афише</Link>}
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
  const date = query.get('date') || defaultBooking.requestedDate;
  const time = query.get('time') || defaultBooking.requestedTime;
  const [selected, setSelected] = useState([sofaPlaces[0]]);
  const total = selected.length * film.price;

  function toggleSeat(place) {
    const exists = selected.some((item) => item.id === place.id);
    if (exists) {
      if (selected.length > 1) setSelected(selected.filter((item) => item.id !== place.id));
      return;
    }
    setSelected([...selected, place]);
  }

  function continueBooking() {
    sessionStorage.setItem('ehi-booking-draft', JSON.stringify({ ...defaultBooking, filmId: film.id, requestedDate: date, requestedTime: time, seats: selected }));
    navigate('/cinema/checkout');
  }

  return (
    <CinemaLayout>
      <section className="seat-page section">
        <Link className="back-link" to={`/cinema/film/${film.id}`}><Icon name="back" /> Назад к фильму</Link>
        <div className="seat-heading"><div><span className="eyebrow">Шаг 1 из 2</span><h1>Выберите место</h1></div><div><strong>{film.title}</strong><span>{formatDate(date)} · {time}</span></div></div>
        <div className="seat-layout">
          <div className="living-room" aria-label="Схема дивана на два места">
            <div className="room-glow" />
            <div className="plasma"><div><Logo compact /></div><i /></div>
            <div className="sofa-selector" role="group" aria-label="Выберите место на диване">
              {sofaPlaces.map((place, index) => {
                const isSelected = selected.some((item) => item.id === place.id);
                return <button type="button" key={place.id} className={`sofa-place ${isSelected ? 'sofa-place--selected' : ''}`} aria-pressed={isSelected} onClick={() => toggleSeat(place)}><span className="sofa-cushion"><i /></span><strong>{place.shortLabel}</strong><small>Место {index + 1}</small></button>;
              })}
            </div>
            <div className="cinema-cat" aria-hidden="true"><i /><b /><span /></div>
            <div className="room-floor" />
          </div>
          <aside className="order-summary"><span className="eyebrow">Бронь</span><h2>{film.title}</h2><div className="summary-row"><span>Дата и время</span><strong>{formatDate(date)} · {time}</strong></div><div className="summary-row"><span>Место</span><strong>{placeNames(selected, true)}</strong></div><div className="summary-total"><span>{selected.length} {selected.length === 1 ? 'билет' : 'билета'}</span><strong>{formatKisses(total, true)}</strong></div><button className="button button--primary button--wide" onClick={continueBooking}>Продолжить <Icon name="arrow" /></button><small>Можно выбрать одно или два места.</small></aside>
        </div>
      </section>
    </CinemaLayout>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const [guest, setGuest] = useState(defaultBooking.guest);
  const booking = useMemo(() => { try { return normalizeBooking(JSON.parse(sessionStorage.getItem('ehi-booking-draft')) || {}); } catch { return defaultBooking; } }, []);
  const film = films.find((item) => item.id === booking.filmId) || films[0];
  const total = booking.seats.length * film.price;

  function confirmBooking(event) {
    event.preventDefault();
    const ticket = { ...booking, guest: guest.trim() || defaultBooking.guest, ticketNumber: makeTicketNumber(), status: 'request', total, createdAt: new Date().toISOString() };
    localStorage.setItem('ehi-booking', JSON.stringify(ticket));
    navigate('/cinema/ticket');
  }

  return (
    <CinemaLayout>
      <section className="checkout-page section">
        <Link className="back-link" to={`/cinema/seats?film=${film.id}&date=${booking.requestedDate}&time=${booking.requestedTime}`}><Icon name="back" /> Назад к местам</Link>
        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={confirmBooking}><span className="eyebrow">Шаг 2 из 2</span><h1>Данные билета</h1><p>Введите имя и фамилию. Остальные поля заполнятся из брони.</p><label>Имя и фамилия<input value={guest} onChange={(event) => setGuest(event.target.value)} required autoComplete="name" maxLength="42" /></label><div className="autofill-note"><Icon name="ticket" /><span>Фильм, дата, время и место уже выбраны. Номер билета создастся после оформления.</span></div><label className="check-label"><input type="checkbox" required defaultChecked /><span><Icon name="check" /></span>Дата и время подтверждаются отдельно</label><button className="button button--primary button--wide" type="submit">Получить билет · {formatKisses(total, true)} <Icon name="heart" /></button><small>Данных карты и списания денег нет.</small></form>
          <aside className="checkout-summary"><Poster film={film} /><div><span className="eyebrow">Бронь</span><h2>{film.title}</h2><p><Icon name="clock" />{formatDate(booking.requestedDate)} · {booking.requestedTime}</p><p><Icon name="pin" />{placeNames(booking.seats, true)}</p><div className="checkout-total"><span>Стоимость</span><strong>{formatKisses(total, true)}</strong></div></div></aside>
        </div>
      </section>
    </CinemaLayout>
  );
}

function Ticket({ booking }) {
  const film = films.find((item) => item.id === booking.filmId) || films[0];
  const templatePath = `${import.meta.env.BASE_URL}ticket-template.png`;
  return (
    <article className="paper-ticket" aria-label={`Билет для ${booking.guest} на фильм «${film.title}»`}>
      <img className="ticket-template-image" src={templatePath} alt="" aria-hidden="true" />
      <span className="ticket-field ticket-field--guest">{booking.guest}</span>
      <span className="ticket-field ticket-field--film">{film.title}</span>
      <span className="ticket-field ticket-field--age">{film.age}</span>
      <span className="ticket-field ticket-field--date">{formatDate(booking.requestedDate)}</span>
      <span className="ticket-field ticket-field--time">{booking.requestedTime}</span>
      <span className="ticket-field ticket-field--hall">1</span>
      <span className="ticket-field ticket-field--row">1</span>
      <span className="ticket-field ticket-field--seat">{seatNumbers(booking.seats)}</span>
      <span className="ticket-field ticket-field--number">№ {booking.ticketNumber}</span>
      <span className="ticket-field ticket-field--stub-number">№ {booking.ticketNumber}</span>
    </article>
  );
}

function readBooking() {
  try { return normalizeBooking(JSON.parse(localStorage.getItem('ehi-booking')) || {}); } catch { return defaultBooking; }
}

function TicketPage() {
  const booking = useMemo(readBooking, []);
  return (
    <CinemaLayout><section className="ticket-page section"><div className="success-mark"><Icon name="check" /></div><span className="eyebrow">Готово</span><h1>Билет сохранён</h1><p>Дата и время пока не подтверждены.</p><div className="ticket-scroll"><Ticket booking={booking} /></div><div className="ticket-actions"><Link className="button button--primary" to="/cinema/tickets">В мои билеты <Icon name="arrow" /></Link><Link className="button button--outline" to="/cinema">Вернуться в афишу</Link></div></section></CinemaLayout>
  );
}

function TicketsPage() {
  const booking = useMemo(readBooking, []);
  return (
    <CinemaLayout><section className="my-tickets section"><div className="section-heading"><div><span className="eyebrow">Билеты</span><h1>Мои билеты</h1></div><p>Здесь хранится последний билет.</p></div><div className="status-banner"><span><i />Ждёт подтверждения</span><strong>{formatDate(booking.requestedDate)} · {booking.requestedTime}</strong></div><div className="ticket-scroll"><Ticket booking={booking} /></div></section></CinemaLayout>
  );
}

function AboutPage() {
  return (
    <CinemaLayout><section className="about-hero section"><span className="eyebrow">О кинотеатре</span><h1>EHI! CINEMA</h1><p>Домашний кинотеатр на два места.</p></section><section className="about-values section"><div><strong>01</strong><h3>Бронирование</h3><p>Выберите фильм, дату, время и место.</p></div><div><strong>02</strong><h3>Стоимость</h3><p>{formatKisses(5)} за место. Банковской оплаты нет.</p></div><div><strong>03</strong><h3>Подтверждение</h3><p>Дата и время окончательно подтверждаются отдельно.</p></div></section></CinemaLayout>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return <><ScrollToTop /><Routes><Route path="/" element={<HomePage />} /><Route path="/cinema" element={<CinemaHome />} /><Route path="/cinema/film/:filmId" element={<FilmPage />} /><Route path="/cinema/seats" element={<SeatPage />} /><Route path="/cinema/checkout" element={<CheckoutPage />} /><Route path="/cinema/ticket" element={<TicketPage />} /><Route path="/cinema/tickets" element={<TicketsPage />} /><Route path="/cinema/about" element={<AboutPage />} /><Route path="*" element={<Navigate to="/cinema" replace />} /></Routes></>;
}
