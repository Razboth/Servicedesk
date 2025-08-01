--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5 (Homebrew)
-- Dumped by pg_dump version 17.5 (Homebrew)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: yanrypangouw
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO yanrypangouw;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: yanrypangouw
--

COMMENT ON SCHEMA public IS '';


--
-- Name: ATMStatus; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."ATMStatus" AS ENUM (
    'ONLINE',
    'OFFLINE',
    'WARNING',
    'ERROR',
    'MAINTENANCE'
);


ALTER TYPE public."ATMStatus" OWNER TO yanrypangouw;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO yanrypangouw;

--
-- Name: FieldType; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."FieldType" AS ENUM (
    'TEXT',
    'TEXTAREA',
    'EMAIL',
    'PHONE',
    'NUMBER',
    'DATE',
    'DATETIME',
    'SELECT',
    'MULTISELECT',
    'RADIO',
    'CHECKBOX',
    'FILE',
    'URL'
);


ALTER TYPE public."FieldType" OWNER TO yanrypangouw;

--
-- Name: IncidentSeverity; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."IncidentSeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."IncidentSeverity" OWNER TO yanrypangouw;

--
-- Name: IncidentStatus; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."IncidentStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."IncidentStatus" OWNER TO yanrypangouw;

--
-- Name: IncidentType; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."IncidentType" AS ENUM (
    'NETWORK_DOWN',
    'HARDWARE_FAILURE',
    'SOFTWARE_ERROR',
    'MAINTENANCE',
    'SECURITY_BREACH'
);


ALTER TYPE public."IncidentType" OWNER TO yanrypangouw;

--
-- Name: IssueClassification; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."IssueClassification" AS ENUM (
    'HUMAN_ERROR',
    'SYSTEM_ERROR',
    'HARDWARE_FAILURE',
    'NETWORK_ISSUE',
    'SECURITY_INCIDENT',
    'DATA_ISSUE',
    'PROCESS_GAP',
    'EXTERNAL_FACTOR'
);


ALTER TYPE public."IssueClassification" OWNER TO yanrypangouw;

--
-- Name: SupportGroup; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."SupportGroup" AS ENUM (
    'IT_HELPDESK',
    'DUKUNGAN_DAN_LAYANAN',
    'SECURITY',
    'NETWORK'
);


ALTER TYPE public."SupportGroup" OWNER TO yanrypangouw;

--
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL',
    'EMERGENCY'
);


ALTER TYPE public."TicketPriority" OWNER TO yanrypangouw;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'IN_PROGRESS',
    'PENDING_VENDOR',
    'RESOLVED',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE public."TicketStatus" OWNER TO yanrypangouw;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'TECHNICIAN',
    'MANAGER',
    'ADMIN',
    'SECURITY_ANALYST'
);


ALTER TYPE public."UserRole" OWNER TO yanrypangouw;

--
-- Name: VendorStatus; Type: TYPE; Schema: public; Owner: yanrypangouw
--

CREATE TYPE public."VendorStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."VendorStatus" OWNER TO yanrypangouw;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public.accounts OWNER TO yanrypangouw;

--
-- Name: atm_incidents; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.atm_incidents (
    id text NOT NULL,
    "atmId" text NOT NULL,
    "ticketId" text,
    type public."IncidentType" NOT NULL,
    severity public."IncidentSeverity" NOT NULL,
    description text NOT NULL,
    status public."IncidentStatus" DEFAULT 'OPEN'::public."IncidentStatus" NOT NULL,
    "detectedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.atm_incidents OWNER TO yanrypangouw;

--
-- Name: atm_monitoring_logs; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.atm_monitoring_logs (
    id text NOT NULL,
    "atmId" text NOT NULL,
    status public."ATMStatus" NOT NULL,
    "responseTime" double precision,
    "errorMessage" text,
    "checkedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.atm_monitoring_logs OWNER TO yanrypangouw;

--
-- Name: atms; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.atms (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "branchId" text NOT NULL,
    "ipAddress" text,
    location text,
    latitude double precision,
    longitude double precision,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.atms OWNER TO yanrypangouw;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    "ticketId" text,
    action text NOT NULL,
    entity text NOT NULL,
    "entityId" text NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO yanrypangouw;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.branches (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    city text,
    province text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.branches OWNER TO yanrypangouw;

--
-- Name: knowledge_articles; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.knowledge_articles (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "categoryId" text,
    tags text[],
    "isPublished" boolean DEFAULT false NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.knowledge_articles OWNER TO yanrypangouw;

--
-- Name: service_categories; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.service_categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "parentId" text,
    level integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.service_categories OWNER TO yanrypangouw;

--
-- Name: service_fields; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.service_fields (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    name text NOT NULL,
    label text NOT NULL,
    type public."FieldType" NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "isUserVisible" boolean DEFAULT true NOT NULL,
    placeholder text,
    "helpText" text,
    "defaultValue" text,
    options jsonb,
    validation jsonb,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.service_fields OWNER TO yanrypangouw;

--
-- Name: services; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.services (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    "helpText" text,
    "categoryId" text NOT NULL,
    "subcategoryId" text,
    "itemId" text,
    "supportGroup" public."SupportGroup" DEFAULT 'IT_HELPDESK'::public."SupportGroup" NOT NULL,
    priority public."TicketPriority" DEFAULT 'MEDIUM'::public."TicketPriority" NOT NULL,
    "estimatedHours" integer DEFAULT 4,
    "slaHours" integer DEFAULT 24 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "requiresApproval" boolean DEFAULT true NOT NULL,
    "isConfidential" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.services OWNER TO yanrypangouw;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO yanrypangouw;

--
-- Name: sla_templates; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.sla_templates (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    "responseHours" integer DEFAULT 4 NOT NULL,
    "resolutionHours" integer DEFAULT 24 NOT NULL,
    "escalationHours" integer DEFAULT 48 NOT NULL,
    "businessHoursOnly" boolean DEFAULT true NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sla_templates OWNER TO yanrypangouw;

--
-- Name: sla_tracking; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.sla_tracking (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "slaTemplateId" text NOT NULL,
    "responseDeadline" timestamp(3) without time zone NOT NULL,
    "resolutionDeadline" timestamp(3) without time zone NOT NULL,
    "escalationDeadline" timestamp(3) without time zone NOT NULL,
    "responseTime" timestamp(3) without time zone,
    "resolutionTime" timestamp(3) without time zone,
    "isResponseBreached" boolean DEFAULT false NOT NULL,
    "isResolutionBreached" boolean DEFAULT false NOT NULL,
    "isEscalated" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sla_tracking OWNER TO yanrypangouw;

--
-- Name: ticket_approvals; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.ticket_approvals (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "approverId" text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.ticket_approvals OWNER TO yanrypangouw;

--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.ticket_attachments (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_attachments OWNER TO yanrypangouw;

--
-- Name: ticket_comments; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.ticket_comments (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    "isInternal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.ticket_comments OWNER TO yanrypangouw;

--
-- Name: ticket_field_values; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.ticket_field_values (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "fieldId" text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.ticket_field_values OWNER TO yanrypangouw;

--
-- Name: tickets; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.tickets (
    id text NOT NULL,
    "ticketNumber" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "serviceId" text NOT NULL,
    "categoryId" text,
    "subcategoryId" text,
    "itemId" text,
    priority public."TicketPriority" DEFAULT 'MEDIUM'::public."TicketPriority" NOT NULL,
    status public."TicketStatus" DEFAULT 'OPEN'::public."TicketStatus" NOT NULL,
    "createdById" text NOT NULL,
    "assignedToId" text,
    "branchId" text,
    "supportGroup" public."SupportGroup" DEFAULT 'IT_HELPDESK'::public."SupportGroup" NOT NULL,
    "isConfidential" boolean DEFAULT false NOT NULL,
    "issueClassification" public."IssueClassification",
    "rootCause" text,
    "preventiveMeasures" text,
    "knowledgeBaseCreated" boolean DEFAULT false NOT NULL,
    "estimatedHours" integer,
    "actualHours" double precision,
    "resolutionNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone
);


ALTER TABLE public.tickets OWNER TO yanrypangouw;

--
-- Name: users; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "branchId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO yanrypangouw;

--
-- Name: vendor_tickets; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.vendor_tickets (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "vendorId" text NOT NULL,
    "vendorTicketId" text,
    status public."VendorStatus" DEFAULT 'PENDING'::public."VendorStatus" NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vendor_tickets OWNER TO yanrypangouw;

--
-- Name: vendors; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.vendors (
    id text NOT NULL,
    name text NOT NULL,
    "contactName" text,
    email text,
    phone text,
    address text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vendors OWNER TO yanrypangouw;

--
-- Name: verification_tokens; Type: TABLE; Schema: public; Owner: yanrypangouw
--

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verification_tokens OWNER TO yanrypangouw;

--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.accounts (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: atm_incidents; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.atm_incidents (id, "atmId", "ticketId", type, severity, description, status, "detectedAt", "resolvedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: atm_monitoring_logs; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.atm_monitoring_logs (id, "atmId", status, "responseTime", "errorMessage", "checkedAt") FROM stdin;
\.


--
-- Data for Name: atms; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.atms (id, code, name, "branchId", "ipAddress", location, latitude, longitude, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.audit_logs (id, "userId", "ticketId", action, entity, "entityId", "oldValues", "newValues", "ipAddress", "userAgent", "createdAt") FROM stdin;
cmdmtt35u000jxu313tc5snxg	cmdmtkmwy0006xuom1yzbv25e	cmdmtkmxg000nxuomlapwtfx2	TICKET_APPROVE	Ticket	cmdmtkmxg000nxuomlapwtfx2	\N	{"status": "APPROVED", "approver": "Branch Manager"}	\N	\N	2025-07-28 08:08:22.338
cmdnqceee0007xums13kurl5c	cmdmtkmwy0006xuom1yzbv25e	cmdnqc23q0003xumsw2g1alpm	TICKET_APPROVE	Ticket	cmdnqc23q0003xumsw2g1alpm	\N	{"status": "APPROVED", "approver": "Branch Manager"}	\N	\N	2025-07-28 23:19:11.078
\.


--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.branches (id, name, code, address, city, province, "isActive", "createdAt", "updatedAt") FROM stdin;
cmdmtkmuc0000xuomslm658ti	Manado Main Branch	MND001	Jl. Sam Ratulangi No. 1	Manado	North Sulawesi	t	2025-07-28 08:01:47.941	2025-07-28 08:01:47.941
cmdmtkmuh0001xuom0mig8dsd	Bitung Branch	BTG001	Jl. Pelabuhan Bitung No. 8	Bitung	North Sulawesi	t	2025-07-28 08:01:47.941	2025-07-28 08:01:47.941
cmdmtkmuh0002xuom9fwccqx3	Tomohon Branch	TMH001	Jl. Raya Tomohon No. 15	Tomohon	North Sulawesi	t	2025-07-28 08:01:47.941	2025-07-28 08:01:47.941
\.


--
-- Data for Name: knowledge_articles; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.knowledge_articles (id, title, content, "categoryId", tags, "isPublished", "viewCount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: service_categories; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.service_categories (id, name, description, "parentId", level, "isActive", "createdAt", "updatedAt") FROM stdin;
cmdmtkmx7000cxuomrx5effat	Network	Network related services	\N	1	t	2025-07-28 08:01:48.043	2025-07-28 08:01:48.043
cmdmtkmx7000axuom9b2mdoqn	Hardware	Hardware related services	\N	1	t	2025-07-28 08:01:48.043	2025-07-28 08:01:48.043
cmdmtkmx7000bxuom5qu92neo	Email	Email related services	\N	1	t	2025-07-28 08:01:48.043	2025-07-28 08:01:48.043
cmdmtkmx70009xuom0iw1h0y2	Software	Software related services	\N	1	t	2025-07-28 08:01:48.043	2025-07-28 08:01:48.043
cmdmtkmxb000dxuomf0wqwydd	Security	Security related services	\N	1	t	2025-07-28 08:01:48.043	2025-07-28 08:01:48.043
\.


--
-- Data for Name: service_fields; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.service_fields (id, "serviceId", name, label, type, "isRequired", "isUserVisible", placeholder, "helpText", "defaultValue", options, validation, "order", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.services (id, name, description, "helpText", "categoryId", "subcategoryId", "itemId", "supportGroup", priority, "estimatedHours", "slaHours", "isActive", "requiresApproval", "isConfidential", "createdAt", "updatedAt") FROM stdin;
cmdmtkmxd000ixuomxol1pyuu	Laptop Request	Request for new laptop	\N	cmdmtkmx7000axuom9b2mdoqn	\N	\N	IT_HELPDESK	MEDIUM	24	48	t	t	f	2025-07-28 08:01:48.049	2025-07-28 08:01:48.049
cmdmtkmxd000hxuom75jl46j7	Printer Setup	Setup new printer	\N	cmdmtkmx7000axuom9b2mdoqn	\N	\N	IT_HELPDESK	MEDIUM	4	24	t	f	f	2025-07-28 08:01:48.049	2025-07-28 08:01:48.049
cmdmtkmxd000jxuom1fmkq8u3	Software Installation	Install software on workstation	\N	cmdmtkmx70009xuom0iw1h0y2	\N	\N	IT_HELPDESK	LOW	2	8	t	f	f	2025-07-28 08:01:48.049	2025-07-28 08:01:48.049
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.sessions (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: sla_templates; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.sla_templates (id, "serviceId", "responseHours", "resolutionHours", "escalationHours", "businessHoursOnly", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sla_tracking; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.sla_tracking (id, "ticketId", "slaTemplateId", "responseDeadline", "resolutionDeadline", "escalationDeadline", "responseTime", "resolutionTime", "isResponseBreached", "isResolutionBreached", "isEscalated", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ticket_approvals; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.ticket_approvals (id, "ticketId", "approverId", status, reason, "createdAt", "updatedAt") FROM stdin;
cmdmtt35q000hxu31t5yoyovg	cmdmtkmxg000nxuomlapwtfx2	cmdmtkmwy0006xuom1yzbv25e	APPROVED	\N	2025-07-28 08:08:22.335	2025-07-28 08:08:22.335
cmdnqceeb0005xumsmtz3i5m2	cmdnqc23q0003xumsw2g1alpm	cmdmtkmwy0006xuom1yzbv25e	APPROVED	\N	2025-07-28 23:19:11.075	2025-07-28 23:19:11.075
\.


--
-- Data for Name: ticket_attachments; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.ticket_attachments (id, "ticketId", filename, "originalName", "mimeType", size, path, "createdAt") FROM stdin;
\.


--
-- Data for Name: ticket_comments; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.ticket_comments (id, "ticketId", "userId", content, "isInternal", "createdAt") FROM stdin;
cmdnr0xqa0001xu5hir15bm7y	cmdnqc23q0003xumsw2g1alpm	cmdmtkmwy0003xuom6rimvvwg	Ticket assigned to IT Technician	t	2025-07-28 23:38:15.874
cmdnr12gr0003xu5hxehe68fa	cmdmvkqug0001xums45a3z5g8	cmdmtkmwy0003xuom6rimvvwg	Ticket assigned to IT Technician	t	2025-07-28 23:38:22.011
\.


--
-- Data for Name: ticket_field_values; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.ticket_field_values (id, "ticketId", "fieldId", value) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.tickets (id, "ticketNumber", title, description, "serviceId", "categoryId", "subcategoryId", "itemId", priority, status, "createdById", "assignedToId", "branchId", "supportGroup", "isConfidential", "issueClassification", "rootCause", "preventiveMeasures", "knowledgeBaseCreated", "estimatedHours", "actualHours", "resolutionNotes", "createdAt", "updatedAt", "resolvedAt", "closedAt") FROM stdin;
cmdmtsa8g000dxu310ep89ykv	TKT-2025-0003	I wanna a new laptop	Give me the baddest evaaaa	cmdmtkmxd000ixuomxol1pyuu	\N	\N	\N	MEDIUM	OPEN	cmdmtkmx30008xuomgswyxhl2	\N	\N	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:07:44.848	2025-07-28 08:07:44.848	\N	\N
cmdmtsvpv000fxu31z3ywalzs	TKT-2025-0004	Test laptop request after login	I need a new laptop for my work. My current laptop is very slow and outdated.	cmdmtkmxd000ixuomxol1pyuu	\N	\N	\N	MEDIUM	OPEN	cmdmtkmwy0006xuom1yzbv25e	\N	\N	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:08:12.691	2025-07-28 08:08:12.691	\N	\N
cmdmtkmxg000nxuomlapwtfx2	TKT-001	Laptop not working	My laptop is not turning on	cmdmtkmxd000ixuomxol1pyuu	\N	\N	\N	HIGH	APPROVED	cmdmtkmx30008xuomgswyxhl2	\N	cmdmtkmuc0000xuomslm658ti	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:01:48.053	2025-07-28 08:08:22.329	\N	\N
cmdmtx5oc000lxu31u8707z92	TKT-2025-0005	Install Application	Install the game I want	cmdmtkmxd000jxuom1fmkq8u3	\N	\N	\N	LOW	OPEN	cmdmtkmx30008xuomgswyxhl2	\N	\N	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:11:32.221	2025-07-28 08:11:32.221	\N	\N
cmdnqc23q0003xumsw2g1alpm	TKT-2025-0007	Install crucial app	INSTALL ME MY GAMES!!!	cmdmtkmxd000jxuom1fmkq8u3	\N	\N	\N	LOW	APPROVED	cmdmtkmx30008xuomgswyxhl2	cmdmtkmwy0003xuom6rimvvwg	\N	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 23:18:55.141	2025-07-28 23:38:15.865	\N	\N
cmdmvkqug0001xums45a3z5g8	TKT-2025-0006	Install aplication please	Install All AAA GAMESS!!	cmdmtkmxd000jxuom1fmkq8u3	\N	\N	\N	LOW	RESOLVED	cmdmtkmx30008xuomgswyxhl2	cmdmtkmwy0003xuom6rimvvwg	\N	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:57:52.359	2025-07-28 23:45:01.089	2025-07-28 23:45:01.088	\N
cmdmtkmxg000mxuomta92o0wd	TKT-002	Install Microsoft Office	Need Microsoft Office installed on my computer	cmdmtkmxd000jxuom1fmkq8u3	\N	\N	\N	MEDIUM	RESOLVED	cmdmtkmx30008xuomgswyxhl2	cmdmtkmwy0003xuom6rimvvwg	cmdmtkmuc0000xuomslm658ti	IT_HELPDESK	f	\N	\N	\N	f	\N	\N	\N	2025-07-28 08:01:48.053	2025-07-28 23:45:03.744	2025-07-28 23:45:03.743	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.users (id, email, name, password, role, "branchId", "isActive", "createdAt", "updatedAt") FROM stdin;
cmdmtkmwy0005xuomzt449qwl	admin@banksulutgo.co.id	Super Admin	$2a$10$XUn9JfnMw7yIvk3ohPS5o.VML3NBguHg71c9KZNi65gKwU4VPQQ3W	ADMIN	\N	t	2025-07-28 08:01:48.035	2025-07-28 08:01:48.035
cmdmtkmwy0003xuom6rimvvwg	tech@banksulutgo.co.id	IT Technician	$2a$10$XUn9JfnMw7yIvk3ohPS5o.VML3NBguHg71c9KZNi65gKwU4VPQQ3W	TECHNICIAN	\N	t	2025-07-28 08:01:48.035	2025-07-28 08:01:48.035
cmdmtkmwy0006xuom1yzbv25e	manager@banksulutgo.co.id	Branch Manager	$2a$10$XUn9JfnMw7yIvk3ohPS5o.VML3NBguHg71c9KZNi65gKwU4VPQQ3W	MANAGER	cmdmtkmuc0000xuomslm658ti	t	2025-07-28 08:01:48.035	2025-07-28 08:01:48.035
cmdmtkmx30008xuomgswyxhl2	user@banksulutgo.co.id	Branch Employee	$2a$10$XUn9JfnMw7yIvk3ohPS5o.VML3NBguHg71c9KZNi65gKwU4VPQQ3W	USER	cmdmtkmuc0000xuomslm658ti	t	2025-07-28 08:01:48.035	2025-07-28 08:01:48.035
\.


--
-- Data for Name: vendor_tickets; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.vendor_tickets (id, "ticketId", "vendorId", "vendorTicketId", status, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: vendors; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.vendors (id, name, "contactName", email, phone, address, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: verification_tokens; Type: TABLE DATA; Schema: public; Owner: yanrypangouw
--

COPY public.verification_tokens (identifier, token, expires) FROM stdin;
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: atm_incidents atm_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atm_incidents
    ADD CONSTRAINT atm_incidents_pkey PRIMARY KEY (id);


--
-- Name: atm_monitoring_logs atm_monitoring_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atm_monitoring_logs
    ADD CONSTRAINT atm_monitoring_logs_pkey PRIMARY KEY (id);


--
-- Name: atms atms_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atms
    ADD CONSTRAINT atms_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: knowledge_articles knowledge_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.knowledge_articles
    ADD CONSTRAINT knowledge_articles_pkey PRIMARY KEY (id);


--
-- Name: service_categories service_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT service_categories_pkey PRIMARY KEY (id);


--
-- Name: service_fields service_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.service_fields
    ADD CONSTRAINT service_fields_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sla_templates sla_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sla_templates
    ADD CONSTRAINT sla_templates_pkey PRIMARY KEY (id);


--
-- Name: sla_tracking sla_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sla_tracking
    ADD CONSTRAINT sla_tracking_pkey PRIMARY KEY (id);


--
-- Name: ticket_approvals ticket_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_approvals
    ADD CONSTRAINT ticket_approvals_pkey PRIMARY KEY (id);


--
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: ticket_field_values ticket_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_field_values
    ADD CONSTRAINT ticket_field_values_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vendor_tickets vendor_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.vendor_tickets
    ADD CONSTRAINT vendor_tickets_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: atms_code_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX atms_code_key ON public.atms USING btree (code);


--
-- Name: branches_code_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX branches_code_key ON public.branches USING btree (code);


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: sla_templates_serviceId_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX "sla_templates_serviceId_key" ON public.sla_templates USING btree ("serviceId");


--
-- Name: ticket_field_values_ticketId_fieldId_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX "ticket_field_values_ticketId_fieldId_key" ON public.ticket_field_values USING btree ("ticketId", "fieldId");


--
-- Name: tickets_ticketNumber_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON public.tickets USING btree ("ticketNumber");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: verification_tokens_identifier_token_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON public.verification_tokens USING btree (identifier, token);


--
-- Name: verification_tokens_token_key; Type: INDEX; Schema: public; Owner: yanrypangouw
--

CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: atm_incidents atm_incidents_atmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atm_incidents
    ADD CONSTRAINT "atm_incidents_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES public.atms(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: atm_monitoring_logs atm_monitoring_logs_atmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atm_monitoring_logs
    ADD CONSTRAINT "atm_monitoring_logs_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES public.atms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: atms atms_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.atms
    ADD CONSTRAINT "atms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_categories service_categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.service_categories
    ADD CONSTRAINT "service_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.service_categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: service_fields service_fields_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.service_fields
    ADD CONSTRAINT "service_fields_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: services services_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.service_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sla_templates sla_templates_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sla_templates
    ADD CONSTRAINT "sla_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sla_tracking sla_tracking_slaTemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sla_tracking
    ADD CONSTRAINT "sla_tracking_slaTemplateId_fkey" FOREIGN KEY ("slaTemplateId") REFERENCES public.sla_templates(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: sla_tracking sla_tracking_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.sla_tracking
    ADD CONSTRAINT "sla_tracking_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_approvals ticket_approvals_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_approvals
    ADD CONSTRAINT "ticket_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ticket_approvals ticket_approvals_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_approvals
    ADD CONSTRAINT "ticket_approvals_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_comments
    ADD CONSTRAINT "ticket_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ticket_field_values ticket_field_values_fieldId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_field_values
    ADD CONSTRAINT "ticket_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES public.service_fields(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ticket_field_values ticket_field_values_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.ticket_field_values
    ADD CONSTRAINT "ticket_field_values_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tickets tickets_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tickets tickets_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tickets tickets_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "tickets_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.services(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: users users_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public.branches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vendor_tickets vendor_tickets_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.vendor_tickets
    ADD CONSTRAINT "vendor_tickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public.tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vendor_tickets vendor_tickets_vendorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yanrypangouw
--

ALTER TABLE ONLY public.vendor_tickets
    ADD CONSTRAINT "vendor_tickets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES public.vendors(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: yanrypangouw
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

