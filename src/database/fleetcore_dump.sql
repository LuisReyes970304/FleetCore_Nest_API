--
-- PostgreSQL database dump
--

\restrict ZwifTIFP49hFULSkse7bWowTiE4ZqpAJrkyzthBI9TN8fbpZRkOiGosRANURlyV

-- Dumped from database version 15.3
-- Dumped by pg_dump version 18.1 (Ubuntu 18.1-1.pgdg22.04+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: maintenance_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_status_enum AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: maintenance_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.maintenance_type_enum AS ENUM (
    'PREVENTIVE',
    'CORRECTIVE'
);


--
-- Name: mechanic_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.mechanic_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: user_role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role_enum AS ENUM (
    'ADMIN',
    'TECHNICIAN'
);


--
-- Name: vehicle_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_status_enum AS ENUM (
    'AVAILABLE',
    'IN_MAINTENANCE',
    'INACTIVE'
);


--
-- Name: workshop_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workshop_status_enum AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance (
    id integer NOT NULL,
    type public.maintenance_type_enum NOT NULL,
    description character varying NOT NULL,
    mileage integer NOT NULL,
    "scheduledAt" timestamp with time zone NOT NULL,
    "scheduledEndAt" timestamp with time zone NOT NULL,
    status public.maintenance_status_enum DEFAULT 'SCHEDULED'::public.maintenance_status_enum NOT NULL,
    "workPerformed" text,
    "finalCost" numeric(10,2),
    "finishedAt" timestamp with time zone,
    "finalMileage" integer,
    "vehicleId" integer NOT NULL,
    "mechanicId" integer NOT NULL,
    "workshopId" integer NOT NULL
);


--
-- Name: maintenance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_id_seq OWNED BY public.maintenance.id;


--
-- Name: mechanic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mechanic (
    id integer NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    specialty character varying NOT NULL,
    status public.mechanic_status_enum DEFAULT 'ACTIVE'::public.mechanic_status_enum NOT NULL,
    "userId" integer
);


--
-- Name: mechanic_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mechanic_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mechanic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mechanic_id_seq OWNED BY public.mechanic.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    email character varying,
    firstname character varying NOT NULL,
    lastname character varying NOT NULL,
    password character varying NOT NULL,
    role public.user_role_enum DEFAULT 'ADMIN'::public.user_role_enum NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: vehicle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle (
    id integer NOT NULL,
    plate character varying NOT NULL,
    brand character varying NOT NULL,
    model character varying NOT NULL,
    year integer NOT NULL,
    mileage integer NOT NULL,
    status public.vehicle_status_enum DEFAULT 'AVAILABLE'::public.vehicle_status_enum NOT NULL
);


--
-- Name: vehicle_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicle_id_seq OWNED BY public.vehicle.id;


--
-- Name: workshop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workshop (
    id integer NOT NULL,
    name character varying NOT NULL,
    address character varying NOT NULL,
    status public.workshop_status_enum DEFAULT 'ACTIVE'::public.workshop_status_enum NOT NULL
);


--
-- Name: workshop_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workshop_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workshop_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workshop_id_seq OWNED BY public.workshop.id;


--
-- Name: maintenance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance ALTER COLUMN id SET DEFAULT nextval('public.maintenance_id_seq'::regclass);


--
-- Name: mechanic id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanic ALTER COLUMN id SET DEFAULT nextval('public.mechanic_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: vehicle id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle ALTER COLUMN id SET DEFAULT nextval('public.vehicle_id_seq'::regclass);


--
-- Name: workshop id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop ALTER COLUMN id SET DEFAULT nextval('public.workshop_id_seq'::regclass);


--
-- Data for Name: maintenance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.maintenance (id, type, description, mileage, "scheduledAt", "scheduledEndAt", status, "workPerformed", "finalCost", "finishedAt", "finalMileage", "vehicleId", "mechanicId", "workshopId") FROM stdin;
1	CORRECTIVE	Revisión de frenos y suspensión	62000	2026-10-27 17:42:43.876+00	2026-10-27 19:12:43.876+00	IN_PROGRESS	\N	\N	\N	\N	3	1	1
2	PREVENTIVE	Cambio de aceite y filtros	45000	2026-10-20 16:42:43.909+00	2026-10-20 18:12:43.909+00	COMPLETED	Cambio de aceite y filtros realizado sin novedad	350000.00	2026-10-27 16:42:43.923+00	45500	1	2	1
\.


--
-- Data for Name: mechanic; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mechanic (id, name, email, specialty, status, "userId") FROM stdin;
1	Carlos Pérez	carlos.perez@fleetcore.com	Motor	ACTIVE	2
2	Laura Gómez	laura.gomez@fleetcore.com	Frenos	ACTIVE	3
3	Jorge Ramírez	jorge.ramirez@fleetcore.com	Eléctrico	INACTIVE	\N
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."user" (id, email, firstname, lastname, password, role, "isActive") FROM stdin;
1	admin@fleetcore.com	Ana	Administradora	$2b$10$sPx0MPmo5tBPMFYApUo8qOH6Wwg11iF62jClXNlqdwDxNez6Lw3DC	ADMIN	t
2	carlos.perez@fleetcore.com	Carlos	Pérez	$2b$10$uE1bptYL/rVUdohAp2hw4eOo1vv98y.H2chquHZKEYWph1WFYwlYS	TECHNICIAN	t
3	laura.gomez@fleetcore.com	Laura	Gómez	$2b$10$DqWtcfLRQee6F0VAXUAFR.2MOPEvmyENCc9AnV/uVB/i.i4tYZxkK	TECHNICIAN	t
4	luisreyes@gmail.com	Luis	Reyes	$2b$10$da4bIAaeipF51lwwhUy9Vub78kdQ7Il9Se5cdm.y6P2RO3n/sIEbq	ADMIN	t
\.


--
-- Data for Name: vehicle; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle (id, plate, brand, model, year, mileage, status) FROM stdin;
2	DEF456	Hino	300	2021	30000	AVAILABLE
4	JKL012	Ford	F350	2015	120000	INACTIVE
3	GHI789	Isuzu	FTR	2019	62000	IN_MAINTENANCE
1	ABC123	Chevrolet	NPR	2022	45000	AVAILABLE
\.


--
-- Data for Name: workshop; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workshop (id, name, address, status) FROM stdin;
1	Taller Norte	Cra 45 # 10-20	ACTIVE
2	Taller Sur	Cra 12 # 30-40	INACTIVE
\.


--
-- Name: maintenance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_id_seq', 2, true);


--
-- Name: mechanic_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mechanic_id_seq', 3, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_id_seq', 4, true);


--
-- Name: vehicle_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vehicle_id_seq', 4, true);


--
-- Name: workshop_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workshop_id_seq', 2, true);


--
-- Name: vehicle PK_187fa17ba39d367e5604b3d1ec9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle
    ADD CONSTRAINT "PK_187fa17ba39d367e5604b3d1ec9" PRIMARY KEY (id);


--
-- Name: maintenance PK_542fb6a28537140d2df95faa52a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT "PK_542fb6a28537140d2df95faa52a" PRIMARY KEY (id);


--
-- Name: user PK_cace4a159ff9f2512dd42373760; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY (id);


--
-- Name: mechanic PK_e5c0ee12979b592454734019732; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanic
    ADD CONSTRAINT "PK_e5c0ee12979b592454734019732" PRIMARY KEY (id);


--
-- Name: workshop PK_e755b83ccf7c711f998012e1c92; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workshop
    ADD CONSTRAINT "PK_e755b83ccf7c711f998012e1c92" PRIMARY KEY (id);


--
-- Name: mechanic UQ_27b601c83843500e33e38732d91; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanic
    ADD CONSTRAINT "UQ_27b601c83843500e33e38732d91" UNIQUE (email);


--
-- Name: vehicle UQ_51922d0c6647cb10de3f76ba4e3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle
    ADD CONSTRAINT "UQ_51922d0c6647cb10de3f76ba4e3" UNIQUE (plate);


--
-- Name: mechanic UQ_93d8226b8d6234bf2b2d1629ad1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanic
    ADD CONSTRAINT "UQ_93d8226b8d6234bf2b2d1629ad1" UNIQUE ("userId");


--
-- Name: user UQ_e12875dfb3b1d92d7d7c5377e22; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE (email);


--
-- Name: IDX_27b601c83843500e33e38732d9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_27b601c83843500e33e38732d9" ON public.mechanic USING btree (email);


--
-- Name: IDX_27efd8ad51aa9597785360b984; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_27efd8ad51aa9597785360b984" ON public.maintenance USING btree ("vehicleId");


--
-- Name: IDX_37968806fbf05bbcf2da3e44bb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_37968806fbf05bbcf2da3e44bb" ON public.workshop USING btree (status);


--
-- Name: IDX_3aaa02ad1f02467535b85c0da2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_3aaa02ad1f02467535b85c0da2" ON public.mechanic USING btree (status);


--
-- Name: IDX_438e6b80ed419a29334e8a5d46; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_438e6b80ed419a29334e8a5d46" ON public.maintenance USING btree ("workshopId");


--
-- Name: IDX_51922d0c6647cb10de3f76ba4e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_51922d0c6647cb10de3f76ba4e" ON public.vehicle USING btree (plate);


--
-- Name: IDX_6620cd026ee2b231beac7cfe57; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6620cd026ee2b231beac7cfe57" ON public."user" USING btree (role);


--
-- Name: IDX_adfe7b7ccdc3f02e5c634adfe8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_adfe7b7ccdc3f02e5c634adfe8" ON public.maintenance USING btree ("mechanicId");


--
-- Name: IDX_b2de2e34be105312e6c1696b6e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_b2de2e34be105312e6c1696b6e" ON public.vehicle USING btree (status);


--
-- Name: IDX_e41685ea89f76aa9cd38cbd18b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_e41685ea89f76aa9cd38cbd18b" ON public.maintenance USING btree (status);


--
-- Name: maintenance FK_27efd8ad51aa9597785360b984d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT "FK_27efd8ad51aa9597785360b984d" FOREIGN KEY ("vehicleId") REFERENCES public.vehicle(id);


--
-- Name: maintenance FK_438e6b80ed419a29334e8a5d468; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT "FK_438e6b80ed419a29334e8a5d468" FOREIGN KEY ("workshopId") REFERENCES public.workshop(id);


--
-- Name: mechanic FK_93d8226b8d6234bf2b2d1629ad1; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mechanic
    ADD CONSTRAINT "FK_93d8226b8d6234bf2b2d1629ad1" FOREIGN KEY ("userId") REFERENCES public."user"(id);


--
-- Name: maintenance FK_adfe7b7ccdc3f02e5c634adfe85; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance
    ADD CONSTRAINT "FK_adfe7b7ccdc3f02e5c634adfe85" FOREIGN KEY ("mechanicId") REFERENCES public.mechanic(id);


--
-- PostgreSQL database dump complete
--

\unrestrict ZwifTIFP49hFULSkse7bWowTiE4ZqpAJrkyzthBI9TN8fbpZRkOiGosRANURlyV

