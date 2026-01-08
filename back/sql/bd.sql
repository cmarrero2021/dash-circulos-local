--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Name: postgres_fdw; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgres_fdw WITH SCHEMA public;


--
-- Name: EXTENSION postgres_fdw; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgres_fdw IS 'foreign-data wrapper for remote PostgreSQL servers';


--
-- Name: validar_estado(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validar_estado() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vestados WHERE id = NEW.estado_id) THEN
    RAISE EXCEPTION 'Valor % no existe en la vista', NEW.estado_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.validar_estado() OWNER TO postgres;

--
-- Name: registro_server_local; Type: SERVER; Schema: -; Owner: postgres
--

CREATE SERVER registro_server_local FOREIGN DATA WRAPPER postgres_fdw OPTIONS (
    dbname 'registro',
    host '192.168.0.17',
    port '5432'
);


ALTER SERVER registro_server_local OWNER TO postgres;

--
-- Name: USER MAPPING postgres SERVER registro_server_local; Type: USER MAPPING; Schema: -; Owner: postgres
--

CREATE USER MAPPING FOR postgres SERVER registro_server_local OPTIONS (
    password 'c-E7E59i8qt]',
    "user" 'tablero'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria_sesiones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria_sesiones (
    id bigint NOT NULL,
    timestamp_intento timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario_introducido character varying(100) NOT NULL,
    ingreso_exitoso boolean NOT NULL,
    ip_origen character varying(45),
    id_usuario_fk bigint,
    timestamp_logout timestamp(6) with time zone
);


ALTER TABLE public.auditoria_sesiones OWNER TO postgres;

--
-- Name: COLUMN auditoria_sesiones.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.id IS 'Identificador único del evento de auditoría.';


--
-- Name: COLUMN auditoria_sesiones.timestamp_intento; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.timestamp_intento IS 'Fecha y hora exactas en que se produjo el intento de login.';


--
-- Name: COLUMN auditoria_sesiones.usuario_introducido; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.usuario_introducido IS 'El email o nombre de usuario que se usó en el formulario de login.';


--
-- Name: COLUMN auditoria_sesiones.ingreso_exitoso; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.ingreso_exitoso IS 'Verdadero si la contraseña fue correcta, falso en caso contrario.';


--
-- Name: COLUMN auditoria_sesiones.ip_origen; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.ip_origen IS 'La dirección IP del cliente que realizó la solicitud.';


--
-- Name: COLUMN auditoria_sesiones.id_usuario_fk; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.id_usuario_fk IS 'Si el login fue exitoso, guarda el ID del usuario para facilitar el seguimiento.';


--
-- Name: COLUMN auditoria_sesiones.timestamp_logout; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.auditoria_sesiones.timestamp_logout IS 'Fecha y hora en que el usuario cerró la sesión activamente. Se actualiza en un registro existente.';


--
-- Name: auditoria_sesiones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditoria_sesiones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditoria_sesiones_id_seq OWNER TO postgres;

--
-- Name: auditoria_sesiones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditoria_sesiones_id_seq OWNED BY public.auditoria_sesiones.id;


--
-- Name: metas_estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metas_estado (
    id integer NOT NULL,
    estado_id integer NOT NULL,
    circulos integer NOT NULL,
    participantes integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.metas_estado OWNER TO postgres;

--
-- Name: metas_estado_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metas_estado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.metas_estado_id_seq OWNER TO postgres;

--
-- Name: metas_estado_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metas_estado_id_seq OWNED BY public.metas_estado.id;


--
-- Name: permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permisos (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.permisos OWNER TO postgres;

--
-- Name: permisos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.permisos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.permisos_id_seq OWNER TO postgres;

--
-- Name: permisos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.permisos_id_seq OWNED BY public.permisos.id;


--
-- Name: rm_circulos_remoto; Type: FOREIGN TABLE; Schema: public; Owner: postgres
--

CREATE FOREIGN TABLE public.rm_circulos_remoto (
    id integer,
    estado_id integer,
    estado text,
    municipio_id integer,
    municipio text,
    parroquia_id integer,
    parroquia text,
    comuna_id integer,
    comuna text,
    circulo text,
    participantes integer,
    constitucion date,
    certificacion date
)
SERVER registro_server_local
OPTIONS (
    schema_name 'public',
    table_name 'vresumen_circulos'
);


ALTER FOREIGN TABLE public.rm_circulos_remoto OWNER TO postgres;

--
-- Name: rm_comunas; Type: FOREIGN TABLE; Schema: public; Owner: postgres
--

CREATE FOREIGN TABLE public.rm_comunas (
    estado_id integer,
    estado text,
    municipio_id integer,
    municipio text,
    parroquia_id integer,
    comuna_id integer,
    comuna text,
    codigo text
)
SERVER registro_server_local
OPTIONS (
    schema_name 'public',
    table_name 'vcomunas'
);


ALTER FOREIGN TABLE public.rm_comunas OWNER TO postgres;

--
-- Name: rm_credenciales; Type: FOREIGN TABLE; Schema: public; Owner: postgres
--

CREATE FOREIGN TABLE public.rm_credenciales (
    id integer NOT NULL,
    request_count integer,
    max_requests integer NOT NULL,
    ip_reassignment_count integer,
    max_ip_reassignments integer,
    create_uid integer,
    write_uid integer,
    token_id character varying,
    ip_address character varying NOT NULL,
    expiration_date timestamp without time zone NOT NULL,
    create_date timestamp without time zone,
    write_date timestamp without time zone,
    partner_id integer,
    email character varying NOT NULL,
    password character varying NOT NULL,
    reset_hash character varying,
    otp character varying,
    otp_reset character varying,
    phone character varying,
    vat character varying NOT NULL,
    user_nationality character varying NOT NULL,
    email_verified boolean,
    otp_expiration timestamp without time zone,
    otp_reset_expiration timestamp without time zone
)
SERVER registro_server_local
OPTIONS (
    schema_name 'public',
    table_name 'api_token'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN request_count OPTIONS (
    column_name 'request_count'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN max_requests OPTIONS (
    column_name 'max_requests'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN ip_reassignment_count OPTIONS (
    column_name 'ip_reassignment_count'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN max_ip_reassignments OPTIONS (
    column_name 'max_ip_reassignments'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN create_uid OPTIONS (
    column_name 'create_uid'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN write_uid OPTIONS (
    column_name 'write_uid'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN token_id OPTIONS (
    column_name 'token_id'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN ip_address OPTIONS (
    column_name 'ip_address'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN expiration_date OPTIONS (
    column_name 'expiration_date'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN create_date OPTIONS (
    column_name 'create_date'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN write_date OPTIONS (
    column_name 'write_date'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN partner_id OPTIONS (
    column_name 'partner_id'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN email OPTIONS (
    column_name 'email'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN password OPTIONS (
    column_name 'password'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN reset_hash OPTIONS (
    column_name 'reset_hash'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN otp OPTIONS (
    column_name 'otp'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN otp_reset OPTIONS (
    column_name 'otp_reset'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN phone OPTIONS (
    column_name 'phone'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN vat OPTIONS (
    column_name 'vat'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN user_nationality OPTIONS (
    column_name 'user_nationality'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN email_verified OPTIONS (
    column_name 'email_verified'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN otp_expiration OPTIONS (
    column_name 'otp_expiration'
);
ALTER FOREIGN TABLE ONLY public.rm_credenciales ALTER COLUMN otp_reset_expiration OPTIONS (
    column_name 'otp_reset_expiration'
);


ALTER FOREIGN TABLE public.rm_credenciales OWNER TO postgres;

--
-- Name: rm_data_circulos; Type: FOREIGN TABLE; Schema: public; Owner: postgres
--

CREATE FOREIGN TABLE public.rm_data_circulos (
    id integer,
    estado_id integer,
    estado text,
    municipio_id integer,
    municipio text,
    parroquia_id integer,
    parroquia text,
    comuna_id integer,
    comuna text,
    circulo text,
    participantes bigint,
    femeninas bigint,
    masculinos bigint,
    venezolanos bigint,
    extranjeros bigint,
    constitucion date,
    certificacion date
)
SERVER registro_server_local
OPTIONS (
    schema_name 'public',
    table_name 'vdata_circulos'
);


ALTER FOREIGN TABLE public.rm_data_circulos OWNER TO postgres;

--
-- Name: rm_registros; Type: FOREIGN TABLE; Schema: public; Owner: postgres
--

CREATE FOREIGN TABLE public.rm_registros (
    id integer NOT NULL,
    company_id integer,
    create_date timestamp without time zone,
    name character varying,
    title integer,
    parent_id integer,
    user_id integer,
    state_id integer,
    country_id integer,
    industry_id integer,
    color integer,
    commercial_partner_id integer,
    create_uid integer,
    write_uid integer,
    complete_name character varying,
    ref character varying,
    lang character varying,
    tz character varying,
    vat character varying,
    company_registry character varying,
    website character varying,
    function character varying,
    type character varying,
    street character varying,
    street2 character varying,
    zip character varying,
    city character varying,
    email character varying,
    phone character varying,
    mobile character varying,
    commercial_company_name character varying,
    company_name character varying,
    date date,
    comment text,
    partner_latitude numeric,
    partner_longitude numeric,
    active boolean,
    employee boolean,
    is_company boolean,
    partner_share boolean,
    write_date timestamp without time zone,
    message_bounce integer,
    email_normalized character varying,
    signup_type character varying,
    signup_expiration timestamp without time zone,
    signup_token character varying,
    website_id integer,
    is_published boolean,
    team_id integer,
    supplier_rank integer,
    customer_rank integer,
    invoice_warn character varying,
    invoice_warn_msg text,
    debit_limit numeric,
    last_time_entries_checked timestamp without time zone,
    ubl_cii_format character varying,
    peppol_endpoint character varying,
    peppol_eas character varying,
    website_meta_og_img character varying,
    website_meta_title jsonb,
    website_meta_description jsonb,
    website_meta_keywords jsonb,
    seo_name jsonb,
    website_description jsonb,
    website_short_description jsonb,
    sale_warn character varying,
    sale_warn_msg text,
    vies_valid boolean,
    user_nationality character varying,
    user_gender character varying,
    birthdate date,
    is_inass_user boolean,
    municipality_id integer,
    parish_id integer,
    housing_status character varying,
    house_type character varying,
    treatment_status character varying,
    food_access character varying,
    feeding_frequency character varying,
    clap_benefit boolean,
    knows_elderly_care_law boolean,
    share_knowledge boolean,
    house_number character varying,
    reference_point character varying,
    is_family_user boolean,
    is_staff_user boolean,
    other_house_type character varying,
    other_skill character varying,
    educational_level character varying,
    civil_state character varying,
    house_type_id integer,
    other_living_with character varying,
    clap_benefit_frequency character varying,
    other_disease character varying,
    clap_complement_frequency character varying,
    is_institutionalized_residency_center character varying,
    residency_center character varying,
    other_expense_source character varying,
    other_social_organization character varying,
    other_ethnicity character varying,
    clap_complement boolean
)
SERVER registro_server_local
OPTIONS (
    schema_name 'public',
    table_name 'res_partner'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN id OPTIONS (
    column_name 'id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN company_id OPTIONS (
    column_name 'company_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN create_date OPTIONS (
    column_name 'create_date'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN name OPTIONS (
    column_name 'name'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN title OPTIONS (
    column_name 'title'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN parent_id OPTIONS (
    column_name 'parent_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN user_id OPTIONS (
    column_name 'user_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN state_id OPTIONS (
    column_name 'state_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN country_id OPTIONS (
    column_name 'country_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN industry_id OPTIONS (
    column_name 'industry_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN color OPTIONS (
    column_name 'color'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN commercial_partner_id OPTIONS (
    column_name 'commercial_partner_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN create_uid OPTIONS (
    column_name 'create_uid'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN write_uid OPTIONS (
    column_name 'write_uid'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN complete_name OPTIONS (
    column_name 'complete_name'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN ref OPTIONS (
    column_name 'ref'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN lang OPTIONS (
    column_name 'lang'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN tz OPTIONS (
    column_name 'tz'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN vat OPTIONS (
    column_name 'vat'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN company_registry OPTIONS (
    column_name 'company_registry'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website OPTIONS (
    column_name 'website'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN function OPTIONS (
    column_name 'function'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN type OPTIONS (
    column_name 'type'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN street OPTIONS (
    column_name 'street'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN street2 OPTIONS (
    column_name 'street2'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN zip OPTIONS (
    column_name 'zip'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN city OPTIONS (
    column_name 'city'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN email OPTIONS (
    column_name 'email'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN phone OPTIONS (
    column_name 'phone'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN mobile OPTIONS (
    column_name 'mobile'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN commercial_company_name OPTIONS (
    column_name 'commercial_company_name'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN company_name OPTIONS (
    column_name 'company_name'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN date OPTIONS (
    column_name 'date'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN comment OPTIONS (
    column_name 'comment'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN partner_latitude OPTIONS (
    column_name 'partner_latitude'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN partner_longitude OPTIONS (
    column_name 'partner_longitude'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN active OPTIONS (
    column_name 'active'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN employee OPTIONS (
    column_name 'employee'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_company OPTIONS (
    column_name 'is_company'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN partner_share OPTIONS (
    column_name 'partner_share'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN write_date OPTIONS (
    column_name 'write_date'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN message_bounce OPTIONS (
    column_name 'message_bounce'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN email_normalized OPTIONS (
    column_name 'email_normalized'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN signup_type OPTIONS (
    column_name 'signup_type'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN signup_expiration OPTIONS (
    column_name 'signup_expiration'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN signup_token OPTIONS (
    column_name 'signup_token'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_id OPTIONS (
    column_name 'website_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_published OPTIONS (
    column_name 'is_published'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN team_id OPTIONS (
    column_name 'team_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN supplier_rank OPTIONS (
    column_name 'supplier_rank'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN customer_rank OPTIONS (
    column_name 'customer_rank'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN invoice_warn OPTIONS (
    column_name 'invoice_warn'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN invoice_warn_msg OPTIONS (
    column_name 'invoice_warn_msg'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN debit_limit OPTIONS (
    column_name 'debit_limit'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN last_time_entries_checked OPTIONS (
    column_name 'last_time_entries_checked'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN ubl_cii_format OPTIONS (
    column_name 'ubl_cii_format'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN peppol_endpoint OPTIONS (
    column_name 'peppol_endpoint'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN peppol_eas OPTIONS (
    column_name 'peppol_eas'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_meta_og_img OPTIONS (
    column_name 'website_meta_og_img'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_meta_title OPTIONS (
    column_name 'website_meta_title'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_meta_description OPTIONS (
    column_name 'website_meta_description'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_meta_keywords OPTIONS (
    column_name 'website_meta_keywords'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN seo_name OPTIONS (
    column_name 'seo_name'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_description OPTIONS (
    column_name 'website_description'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN website_short_description OPTIONS (
    column_name 'website_short_description'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN sale_warn OPTIONS (
    column_name 'sale_warn'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN sale_warn_msg OPTIONS (
    column_name 'sale_warn_msg'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN vies_valid OPTIONS (
    column_name 'vies_valid'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN user_nationality OPTIONS (
    column_name 'user_nationality'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN user_gender OPTIONS (
    column_name 'user_gender'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN birthdate OPTIONS (
    column_name 'birthdate'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_inass_user OPTIONS (
    column_name 'is_inass_user'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN municipality_id OPTIONS (
    column_name 'municipality_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN parish_id OPTIONS (
    column_name 'parish_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN housing_status OPTIONS (
    column_name 'housing_status'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN house_type OPTIONS (
    column_name 'house_type'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN treatment_status OPTIONS (
    column_name 'treatment_status'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN food_access OPTIONS (
    column_name 'food_access'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN feeding_frequency OPTIONS (
    column_name 'feeding_frequency'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN clap_benefit OPTIONS (
    column_name 'clap_benefit'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN knows_elderly_care_law OPTIONS (
    column_name 'knows_elderly_care_law'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN share_knowledge OPTIONS (
    column_name 'share_knowledge'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN house_number OPTIONS (
    column_name 'house_number'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN reference_point OPTIONS (
    column_name 'reference_point'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_family_user OPTIONS (
    column_name 'is_family_user'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_staff_user OPTIONS (
    column_name 'is_staff_user'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_house_type OPTIONS (
    column_name 'other_house_type'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_skill OPTIONS (
    column_name 'other_skill'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN educational_level OPTIONS (
    column_name 'educational_level'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN civil_state OPTIONS (
    column_name 'civil_state'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN house_type_id OPTIONS (
    column_name 'house_type_id'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_living_with OPTIONS (
    column_name 'other_living_with'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN clap_benefit_frequency OPTIONS (
    column_name 'clap_benefit_frequency'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_disease OPTIONS (
    column_name 'other_disease'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN clap_complement_frequency OPTIONS (
    column_name 'clap_complement_frequency'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN is_institutionalized_residency_center OPTIONS (
    column_name 'is_institutionalized_residency_center'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN residency_center OPTIONS (
    column_name 'residency_center'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_expense_source OPTIONS (
    column_name 'other_expense_source'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_social_organization OPTIONS (
    column_name 'other_social_organization'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN other_ethnicity OPTIONS (
    column_name 'other_ethnicity'
);
ALTER FOREIGN TABLE ONLY public.rm_registros ALTER COLUMN clap_complement OPTIONS (
    column_name 'clap_complement'
);


ALTER FOREIGN TABLE public.rm_registros OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: roles_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles_permisos (
    rol_id integer NOT NULL,
    permiso_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.roles_permisos OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    cedula integer NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    activo boolean DEFAULT true,
    rol_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_estados_permitidos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_estados_permitidos (
    usuario_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    estado_id integer NOT NULL
);


ALTER TABLE public.usuarios_estados_permitidos OWNER TO postgres;

--
-- Name: TABLE usuarios_estados_permitidos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios_estados_permitidos IS 'Almacena los IDs de los estados a los que un usuario tiene acceso completo.';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: usuarios_municipios_permitidos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_municipios_permitidos (
    usuario_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    estado_id integer NOT NULL,
    municipio_id integer NOT NULL
);


ALTER TABLE public.usuarios_municipios_permitidos OWNER TO postgres;

--
-- Name: TABLE usuarios_municipios_permitidos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.usuarios_municipios_permitidos IS 'Almacena los IDs de los municipios específicos a los que un usuario tiene acceso.';


--
-- Name: usuarios_permisos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios_permisos (
    usuario_id integer NOT NULL,
    permiso_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE public.usuarios_permisos OWNER TO postgres;

--
-- Name: vcertificaciones_diarias; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcertificaciones_diarias AS
 SELECT certificacion AS fecha,
    count(circulo) AS certificaciones
   FROM public.rm_circulos_remoto a
  GROUP BY certificacion
  ORDER BY certificacion;


ALTER VIEW public.vcertificaciones_diarias OWNER TO postgres;

--
-- Name: vcirculos_estados_municipios; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcirculos_estados_municipios AS
 SELECT estado,
    municipio,
    count(municipio) AS avance
   FROM public.rm_circulos_remoto
  GROUP BY estado, municipio
  ORDER BY estado, municipio;


ALTER VIEW public.vcirculos_estados_municipios OWNER TO postgres;

--
-- Name: vcirculos_estados_municipios_comunas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcirculos_estados_municipios_comunas AS
 SELECT estado,
    municipio,
    comuna,
    count(municipio) AS avance
   FROM public.rm_circulos_remoto
  GROUP BY estado, municipio, comuna
  ORDER BY estado, municipio, comuna;


ALTER VIEW public.vcirculos_estados_municipios_comunas OWNER TO postgres;

--
-- Name: vcirculos_estados_municipios_parroquias; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcirculos_estados_municipios_parroquias AS
 SELECT estado_id,
    estado,
    municipio_id,
    municipio,
    parroquia_id,
    parroquia,
    count(municipio) AS avance
   FROM public.rm_circulos_remoto
  GROUP BY estado_id, estado, municipio_id, municipio, parroquia_id, parroquia
  ORDER BY estado, municipio, parroquia;


ALTER VIEW public.vcirculos_estados_municipios_parroquias OWNER TO postgres;

--
-- Name: vcirculos_estados_municipios_parroquias_comunas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcirculos_estados_municipios_parroquias_comunas AS
 SELECT estado_id,
    estado,
    municipio_id,
    municipio,
    parroquia_id,
    parroquia,
    comuna_id,
    comuna,
    count(comuna) AS avance
   FROM public.rm_circulos_remoto
  GROUP BY estado_id, estado, municipio_id, municipio, parroquia_id, parroquia, comuna_id, comuna
  ORDER BY estado, municipio, parroquia, comuna;


ALTER VIEW public.vcirculos_estados_municipios_parroquias_comunas OWNER TO postgres;

--
-- Name: vcumplimiento_circulos_estados; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcumplimiento_circulos_estados AS
 SELECT a.estado_id,
    a.estado,
    b.circulos AS meta_circulo,
    count(a.*) AS circulos,
    round((((count(a.*))::numeric / (NULLIF(b.circulos, 0))::numeric) * (100)::numeric), 2) AS porcentaje
   FROM (public.rm_circulos_remoto a
     LEFT JOIN public.metas_estado b ON ((b.estado_id = a.estado_id)))
  GROUP BY a.estado_id, a.estado, b.circulos
  ORDER BY a.estado;


ALTER VIEW public.vcumplimiento_circulos_estados OWNER TO postgres;

--
-- Name: vcumplimiento_metas; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vcumplimiento_metas AS
 SELECT a.estado_id,
    a.estado,
    b.circulos AS meta_circulos,
    count(a.circulo) AS circulos_certificados,
    b.participantes AS meta_participantes,
    sum(a.participantes) AS participantes_certificados
   FROM (public.rm_circulos_remoto a
     LEFT JOIN public.metas_estado b ON ((b.estado_id = a.estado_id)))
  GROUP BY a.estado_id, a.estado, b.circulos, b.participantes
  ORDER BY a.estado;


ALTER VIEW public.vcumplimiento_metas OWNER TO postgres;

--
-- Name: vestados; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vestados AS
 SELECT DISTINCT estado_id AS id,
    estado
   FROM public.rm_comunas
  ORDER BY estado;


ALTER VIEW public.vestados OWNER TO postgres;

--
-- Name: vindicadores; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vindicadores AS
 SELECT 104800 AS meta,
    (( SELECT count(rm_circulos_remoto.circulo) AS count
           FROM public.rm_circulos_remoto))::integer AS acumulado,
    (( SELECT (104800 - count(rm_circulos_remoto.circulo))
           FROM public.rm_circulos_remoto))::integer AS diferencia,
    ('2025-12-15'::date - (now())::date) AS dias_faltantes,
    ((( SELECT (100737 - count(rm_circulos_remoto.circulo))
           FROM public.rm_circulos_remoto))::integer / ('2025-12-15'::date - (now())::date)) AS promedio_necesario,
    (( SELECT (avg(sub.circulos_por_fecha))::numeric(10,2) AS avg
           FROM ( SELECT rm_circulos_remoto.certificacion,
                    count(*) AS circulos_por_fecha
                   FROM public.rm_circulos_remoto
                  GROUP BY rm_circulos_remoto.certificacion) sub))::integer AS promedio_diario,
    (( SELECT max(sub.circulos_por_fecha) AS max
           FROM ( SELECT rm_circulos_remoto.certificacion,
                    count(*) AS circulos_por_fecha
                   FROM public.rm_circulos_remoto
                  GROUP BY rm_circulos_remoto.certificacion) sub))::integer AS maximo_por_fecha,
    ( SELECT sub.certificacion
           FROM ( SELECT rm_circulos_remoto.certificacion,
                    count(*) AS circulos_por_fecha
                   FROM public.rm_circulos_remoto
                  GROUP BY rm_circulos_remoto.certificacion
                  ORDER BY (count(*)) DESC
                 LIMIT 1) sub) AS fecha_maxima,
    ( SELECT sum(rm_circulos_remoto.participantes) AS participantes
           FROM public.rm_circulos_remoto) AS participantes,
    ( SELECT (avg(rm_circulos_remoto.participantes))::integer AS participantes_promedio
           FROM public.rm_circulos_remoto) AS promedio;


ALTER VIEW public.vindicadores OWNER TO postgres;

--
-- Name: vindicadores_estados; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vindicadores_estados AS
 WITH metas AS (
         SELECT metas_estado.estado_id,
            (sum(metas_estado.circulos))::integer AS meta
           FROM public.metas_estado
          GROUP BY metas_estado.estado_id
        ), acumulados AS (
         SELECT rm_circulos_remoto.estado_id,
            (count(*))::integer AS acumulado,
            (count(DISTINCT rm_circulos_remoto.certificacion))::integer AS dias_con_registro
           FROM public.rm_circulos_remoto
          GROUP BY rm_circulos_remoto.estado_id
        ), picos AS (
         SELECT DISTINCT ON (rm_circulos_remoto.estado_id) rm_circulos_remoto.estado_id,
            rm_circulos_remoto.certificacion AS fecha,
            (count(*))::integer AS total
           FROM public.rm_circulos_remoto
          GROUP BY rm_circulos_remoto.estado_id, rm_circulos_remoto.certificacion
          ORDER BY rm_circulos_remoto.estado_id, (count(*)) DESC, rm_circulos_remoto.certificacion DESC
        ), participantes AS (
         SELECT rm_circulos_remoto.estado_id,
            sum(rm_circulos_remoto.participantes) AS participantes
           FROM public.rm_circulos_remoto
          GROUP BY rm_circulos_remoto.estado_id
        ), promedio AS (
         SELECT rm_circulos_remoto.estado_id,
            (avg(rm_circulos_remoto.participantes))::integer AS promedio
           FROM public.rm_circulos_remoto
          GROUP BY rm_circulos_remoto.estado_id
        ), constants AS (
         SELECT GREATEST(('2025-12-15'::date - CURRENT_DATE), 0) AS dias_faltantes
        )
 SELECT e.id AS estado_id,
    e.estado AS estado_nombre,
    COALESCE(m.meta, 0) AS meta,
    COALESCE(a.acumulado, 0) AS acumulado,
    (COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0)) AS diferencia,
    c.dias_faltantes,
        CASE
            WHEN (c.dias_faltantes > 0) THEN floor(((GREATEST((COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0)), 0))::numeric / (c.dias_faltantes)::numeric))
            ELSE (GREATEST((COALESCE(m.meta, 0) - COALESCE(a.acumulado, 0)), 0))::numeric
        END AS promedio_necesario,
        CASE
            WHEN (COALESCE(a.dias_con_registro, 0) > 0) THEN floor(((COALESCE(a.acumulado, 0))::numeric / (a.dias_con_registro)::numeric))
            ELSE (0)::numeric
        END AS promedio_diario,
    COALESCE(p.total, 0) AS maximo_por_fecha,
    p.fecha AS fecha_maxima,
    pa.participantes,
    pr.promedio
   FROM (((((public.vestados e
     LEFT JOIN metas m ON ((m.estado_id = e.id)))
     LEFT JOIN acumulados a ON ((a.estado_id = e.id)))
     LEFT JOIN picos p ON ((p.estado_id = e.id)))
     LEFT JOIN participantes pa ON ((pa.estado_id = e.id)))
     LEFT JOIN promedio pr ON ((pr.estado_id = e.id))),
    constants c
  WHERE ((e.id > 1748) AND (e.id < 1775))
  ORDER BY e.estado;


ALTER VIEW public.vindicadores_estados OWNER TO postgres;

--
-- Name: vregistros_estados; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vregistros_estados AS
 SELECT a.state_id,
    b.estado,
    count(*) AS registros
   FROM (public.rm_registros a
     LEFT JOIN public.vestados b ON ((b.id = a.state_id)))
  WHERE (b.estado IS NOT NULL)
  GROUP BY a.state_id, b.estado
  ORDER BY b.estado;


ALTER VIEW public.vregistros_estados OWNER TO postgres;

--
-- Name: auditoria_sesiones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_sesiones ALTER COLUMN id SET DEFAULT nextval('public.auditoria_sesiones_id_seq'::regclass);


--
-- Name: metas_estado id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_estado ALTER COLUMN id SET DEFAULT nextval('public.metas_estado_id_seq'::regclass);


--
-- Name: permisos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos ALTER COLUMN id SET DEFAULT nextval('public.permisos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: auditoria_sesiones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria_sesiones (id, timestamp_intento, usuario_introducido, ingreso_exitoso, ip_origen, id_usuario_fk, timestamp_logout) FROM stdin;
1	2025-11-10 11:50:27.612425-04	admin@correo.com	f	::ffff:127.0.0.1	3	\N
2	2025-11-10 11:50:34.066478-04	admin@correo.com	f	::ffff:127.0.0.1	3	\N
3	2025-11-10 12:02:59.573123-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-10 12:04:56.975756-04
4	2025-11-10 14:11:22.22615-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-10 18:12:51.389744-04
5	2025-11-10 18:13:36.697581-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
6	2025-11-11 12:10:08.277994-04	test@example.com	f	::ffff:127.0.0.1	\N	\N
7	2025-11-11 12:10:32.918701-04	test@example.com	f	::ffff:127.0.0.1	\N	\N
8	2025-11-11 12:15:04.707314-04	test@example.com	f	::ffff:127.0.0.1	\N	\N
9	2025-11-11 12:15:22.46488-04	test@example.com	f	::ffff:127.0.0.1	\N	\N
10	2025-11-11 13:16:16.289053-04	test@example.com	f	::ffff:127.0.0.1	\N	\N
11	2025-11-11 13:17:21.832456-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
12	2025-11-11 13:28:06.753166-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
13	2025-11-11 16:38:23.223832-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-11 16:44:32.423091-04
14	2025-11-11 16:44:53.597527-04	cmarrero@correo.com	f	::ffff:127.0.0.1	\N	\N
15	2025-11-11 16:45:06.182613-04	admin@correo.com	f	::ffff:127.0.0.1	3	\N
16	2025-11-11 16:45:49.2495-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-11 16:47:56.74348-04
17	2025-11-11 16:50:54.47706-04	passord123	f	::ffff:127.0.0.1	\N	\N
18	2025-11-11 16:51:06.32915-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-11 16:57:31.689186-04
19	2025-11-11 16:57:50.045401-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
20	2025-11-11 17:33:21.638643-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
21	2025-11-12 08:01:55.996384-04	admin@correo.com	t	::1	3	\N
22	2025-11-12 17:34:01.362759-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
23	2025-11-12 17:49:33.578431-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
24	2025-11-12 17:49:33.703553-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
25	2025-11-12 17:50:21.289712-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
26	2025-11-13 18:01:38.808768-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
27	2025-11-17 06:21:10.840304-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-17 08:43:56.558431-04
28	2025-11-17 08:44:04.434442-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-17 08:53:06.285637-04
29	2025-11-17 08:53:09.894799-04	admin@correo.com	t	::ffff:127.0.0.1	3	2025-11-17 09:17:16.416725-04
30	2025-11-17 09:17:20.404247-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
31	2025-11-17 09:21:53.72285-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
32	2025-11-17 09:21:59.016451-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
33	2025-11-17 09:23:12.337304-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
34	2025-11-17 09:23:19.238419-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
35	2025-11-17 09:34:20.675233-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
36	2025-11-17 09:36:01.882157-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
37	2025-11-17 09:36:50.277985-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
38	2025-11-17 09:38:12.763982-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
39	2025-11-17 09:38:33.101452-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
40	2025-11-17 09:40:21.589853-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
41	2025-11-17 09:42:08.240733-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
42	2025-11-17 09:44:43.485865-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
43	2025-11-17 09:46:15.196151-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
44	2025-11-17 09:49:07.063389-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
45	2025-11-17 09:50:28.392654-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
46	2025-11-17 09:54:08.935116-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
47	2025-11-17 10:12:08.429694-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
48	2025-11-17 16:51:56.529644-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
49	2025-11-17 16:53:18.99439-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
50	2025-11-17 16:54:35.132557-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
51	2025-11-17 17:01:31.794272-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
52	2025-11-17 17:01:56.474328-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
53	2025-11-17 17:03:53.871707-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
54	2025-11-17 17:21:05.517134-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
55	2025-11-17 17:49:51.339939-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
56	2025-11-17 17:58:24.543884-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
57	2025-11-17 17:59:31.036553-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
58	2025-11-17 18:06:18.091008-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
59	2025-11-17 18:27:15.122238-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
60	2025-11-17 18:27:27.538192-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
61	2025-11-17 18:27:54.957849-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
62	2025-11-17 18:28:24.381584-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
63	2025-11-17 18:48:21.262837-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
64	2025-11-17 18:50:28.734189-04	aragua@correo.com	f	::ffff:127.0.0.1	\N	\N
65	2025-11-17 18:50:37.101158-04	aragua@gmail.com	t	::ffff:127.0.0.1	6	\N
66	2025-11-17 18:51:29.601437-04	dttocapital@correo.com	f	::ffff:127.0.0.1	\N	\N
67	2025-11-17 18:51:35.907614-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
68	2025-11-17 19:09:02.493979-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
69	2025-11-18 06:30:53.608869-04	aragua@gmail.com	t	::ffff:127.0.0.1	6	\N
70	2025-11-18 07:05:16.070784-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
71	2025-11-18 11:48:33.012971-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
72	2025-11-18 11:50:34.149507-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
73	2025-11-18 12:03:35.025019-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
74	2025-11-18 13:36:23.378887-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
75	2025-11-19 07:24:58.960069-04	admin@correo.com	t	::1	3	\N
76	2025-11-19 09:06:02.790166-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
77	2025-11-19 16:33:12.171219-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
78	2025-11-19 16:41:50.520198-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
79	2025-11-19 16:51:45.407885-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
80	2025-11-19 16:52:57.377223-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
81	2025-11-19 17:29:41.771348-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
82	2025-11-19 17:41:42.635992-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
83	2025-11-19 17:44:31.663947-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
84	2025-11-19 18:32:04.228468-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
85	2025-11-19 18:36:46.46509-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
86	2025-11-19 18:37:28.733457-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
87	2025-11-19 18:38:43.57314-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	7	\N
88	2025-11-19 18:38:49.076332-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
89	2025-11-19 18:49:52.487165-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
90	2025-11-19 18:59:05.219345-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
91	2025-11-19 19:31:48.68505-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
92	2025-11-19 19:42:08.713842-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
93	2025-11-20 13:03:18.073895-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
94	2025-11-20 13:41:06.179736-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
95	2025-11-20 13:44:29.398706-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
96	2025-11-21 07:15:41.143633-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
97	2025-11-21 07:50:40.843928-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
98	2025-11-21 07:53:19.974899-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
99	2025-11-24 15:27:50.013501-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
100	2025-11-24 16:00:24.455425-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
101	2025-11-24 16:00:54.872457-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
102	2025-11-24 16:21:38.824804-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
103	2025-11-24 16:25:34.394185-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
104	2025-11-25 08:08:23.243822-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
105	2025-11-25 09:30:21.694927-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
106	2025-11-25 10:34:54.843317-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
107	2025-11-25 11:40:33.437769-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
108	2025-11-25 16:40:40.581465-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
109	2025-11-26 07:59:51.875365-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
110	2025-11-26 09:02:26.579534-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
111	2025-11-26 10:03:08.945557-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
112	2025-11-26 11:47:27.735059-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
113	2025-11-26 13:00:01.792288-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
114	2025-11-26 14:07:51.781375-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
115	2025-11-26 15:10:07.386545-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
116	2025-11-26 16:32:21.01536-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
117	2025-11-26 17:39:26.414361-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
118	2025-11-26 18:16:29.652023-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	7	\N
119	2025-11-26 18:17:09.203674-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	7	\N
120	2025-11-26 18:17:40.933902-04	estadal@example.com	t	::ffff:127.0.0.1	5	\N
121	2025-11-26 18:19:37.979085-04	laguaira@example.com	t	::ffff:127.0.0.1	5	\N
122	2025-11-26 18:22:01.625677-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
123	2025-11-26 18:23:14.732066-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
124	2025-11-26 18:25:00.11324-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
125	2025-11-27 13:35:07.540044-04	cmarrero@correo.com	f	::1	\N	\N
126	2025-11-27 13:35:23.015382-04	cmarrero@correo.com	f	::1	\N	\N
127	2025-11-27 13:36:02.325795-04	amazonas@correo.com	f	::ffff:127.0.0.1	\N	\N
128	2025-11-27 13:36:18.496983-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
129	2025-11-27 13:45:44.225139-04	amazonas@correo.com	f	::ffff:127.0.0.1	\N	\N
130	2025-11-27 13:45:51.342112-04	amazonas@correo.com	f	::ffff:127.0.0.1	\N	\N
131	2025-11-27 13:47:07.300802-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
132	2025-11-27 13:47:27.269297-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
133	2025-11-27 13:47:52.31185-04	amazonas@correo.com	f	::ffff:127.0.0.1	\N	\N
134	2025-11-27 13:48:07.259934-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
135	2025-11-27 14:11:42.543676-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
136	2025-11-27 14:15:40.486342-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
137	2025-11-27 14:16:05.42486-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
138	2025-11-27 14:19:05.21226-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
139	2025-11-27 14:26:38.036258-04	dttocapital@gmail.com	t	::ffff:127.0.0.1	7	\N
140	2025-11-27 14:27:25.924329-04	cmarrero@correo.com	f	::1	\N	\N
141	2025-11-27 14:27:39.260945-04	cmarrero@correo.com	f	::1	\N	\N
142	2025-11-27 14:27:57.70239-04	admin@correo.com	t	::1	3	\N
143	2025-11-27 14:28:21.238073-04	dttocapital@correo.com	f	::1	\N	\N
144	2025-11-27 14:28:35.14035-04	dttocapital@correo.com	f	::1	\N	\N
145	2025-11-27 14:29:11.318713-04	dttocapital@correo.com	t	::1	7	\N
146	2025-11-27 14:34:13.283368-04	admin@correo.com	t	::1	3	\N
147	2025-11-27 14:41:12.423818-04	dttocapital@correo.com	t	::1	7	\N
148	2025-11-27 14:41:52.143276-04	dttocapital@correo.com	t	::1	7	\N
149	2025-11-27 14:42:35.593558-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
150	2025-11-27 14:42:44.89463-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
151	2025-11-27 14:42:56.866675-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
152	2025-11-27 14:44:26.784981-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
153	2025-11-27 14:44:33.627774-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
154	2025-11-27 14:47:00.733179-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
155	2025-11-27 14:47:07.122449-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
156	2025-11-27 14:47:22.181971-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
157	2025-11-27 14:55:27.361003-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
158	2025-11-27 14:55:44.231172-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
159	2025-11-27 15:04:46.954638-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
160	2025-11-27 15:05:12.598409-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
161	2025-11-27 15:05:22.119705-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
162	2025-11-27 15:11:48.034938-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
163	2025-11-27 16:33:29.35446-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
164	2025-11-27 17:07:39.632739-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
165	2025-11-27 17:07:47.19921-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
166	2025-11-28 07:13:49.192183-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
167	2025-11-28 07:13:55.721454-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
168	2025-11-28 07:19:24.090962-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
169	2025-11-28 08:20:22.300981-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
170	2025-11-28 08:20:29.611299-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
171	2025-11-28 08:30:17.004377-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
172	2025-11-28 08:31:20.729761-04	dttocapital@gmail.com	f	::ffff:127.0.0.1	\N	\N
173	2025-11-28 08:31:28.967863-04	dttocapital@correo.com	t	::ffff:127.0.0.1	7	\N
174	2025-11-28 08:35:34.677245-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
175	2025-11-28 08:36:33.033544-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
176	2025-11-28 08:40:03.298542-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
177	2025-11-28 08:45:44.392063-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
178	2025-11-28 10:10:23.584905-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
179	2025-11-28 11:35:27.72557-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
180	2025-11-28 14:26:49.138238-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
181	2025-11-28 15:27:20.766033-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
182	2025-11-28 16:13:25.49316-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
183	2025-11-28 16:28:46.335859-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
184	2025-11-28 16:29:27.116741-04	aragua@correo.com	t	::ffff:127.0.0.1	6	\N
185	2025-11-28 16:58:17.105354-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
186	2025-11-28 18:02:33.279221-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
187	2025-12-01 06:44:59.096965-04	cmarrero@correo.com	f	::ffff:127.0.0.1	\N	\N
188	2025-12-01 06:45:11.016721-04	cmarrero@correo.com	f	::ffff:127.0.0.1	\N	\N
189	2025-12-01 06:49:07.113272-04	cmarrero@correo.com	f	::ffff:127.0.0.1	\N	\N
190	2025-12-01 06:52:09.321519-04	cmarrero@correo.com	f	::ffff:127.0.0.1	\N	\N
191	2025-12-01 06:52:43.540562-04	admin@correo.com	t	::ffff:127.0.0.1	3	\N
\.


--
-- Data for Name: metas_estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.metas_estado (id, estado_id, circulos, participantes, created_at, updated_at) FROM stdin;
1	1749	1000	18000	2025-11-11 18:40:41.46172	\N
2	1750	4000	72000	2025-11-11 18:40:41.46172	\N
3	1751	4000	72000	2025-11-11 18:40:41.46172	\N
4	1752	8000	144000	2025-11-11 18:40:41.46172	\N
5	1753	3000	54000	2025-11-11 18:40:41.46172	\N
6	1754	8000	144000	2025-11-11 18:40:41.46172	\N
7	1755	9000	162000	2025-11-11 18:40:41.46172	\N
8	1756	1200	21600	2025-11-11 18:40:41.46172	\N
9	1757	1000	18000	2025-11-11 18:40:41.46172	\N
10	1758	5000	90000	2025-11-11 18:40:41.46172	\N
11	1759	4000	72000	2025-11-11 18:40:41.46172	\N
12	1760	3000	54000	2025-11-11 18:40:41.46172	\N
13	1774	1600	28800	2025-11-11 18:40:41.46172	\N
14	1761	7000	126000	2025-11-11 18:40:41.46172	\N
15	1762	3000	54000	2025-11-11 18:40:41.46172	\N
16	1763	9000	162000	2025-11-11 18:40:41.46172	\N
17	1764	2000	36000	2025-11-11 18:40:41.46172	\N
18	1765	2000	36000	2025-11-11 18:40:41.46172	\N
19	1766	4000	72000	2025-11-11 18:40:41.46172	\N
20	1767	5000	90000	2025-11-11 18:40:41.46172	\N
21	1768	2000	36000	2025-11-11 18:40:41.46172	\N
22	1769	3000	54000	2025-11-11 18:40:41.46172	\N
23	1770	3000	54000	2025-11-11 18:40:41.46172	\N
24	1771	12000	216000	2025-11-11 18:40:41.46172	\N
\.


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permisos (id, nombre, descripcion, created_at, updated_at) FROM stdin;
1	manage_users	Permite crear, editar y suspender usuarios.	2025-11-10 11:31:18.053339	\N
2	manage_permissions	Permite crear, leer, actualizar y eliminar los permisos del sistema.	2025-11-10 18:06:55.744149	\N
3	manage_roles	Permite crear, leer, actualizar y eliminar roles, y asignarles permisos.	2025-11-10 18:06:55.744149	\N
4	assign_geo_permissions	Permite asignar y quitar permisos de acceso geográfico (estados/municipios) a los usuarios.	2025-11-10 18:06:55.744149	\N
5	ver_dashboard_nacional	Otorga acceso a todos los datos del dashboard sin restricciones geográficas.	2025-11-10 18:06:55.744149	\N
6	view_locations	Permite obtener las listas de estados y municipios para la asignación de permisos.	2025-11-10 18:06:55.744149	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, nombre, descripcion, created_at, updated_at) FROM stdin;
1	Administrador	Acceso total al sistema.	2025-11-10 11:32:17.480977	\N
2	Estadal	Rol con acceso restringido a ciertos estados	2025-11-17 16:45:36.880222	\N
\.


--
-- Data for Name: roles_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles_permisos (rol_id, permiso_id, created_at, updated_at) FROM stdin;
1	1	2025-11-10 11:32:56.040946	\N
1	2	2025-11-10 18:08:19.227809	\N
1	3	2025-11-10 18:08:19.227809	\N
1	4	2025-11-10 18:08:19.227809	\N
1	5	2025-11-10 18:08:19.227809	\N
1	6	2025-11-10 18:08:19.227809	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id, nombre, cedula, email, password_hash, activo, rol_id, created_at, updated_at) FROM stdin;
3	Usuario Admin	1	admin@correo.com	$2b$10$5kRbXFlR2XpIBOa2k5ilz.JRNXaOBY613b8.hPJonwNfRdHUAZJMm	t	1	2025-11-10 11:37:05.366352	\N
5	Usuario Estadal	12345678	laguaira@example.com	$2b$10$5kRbXFlR2XpIBOa2k5ilz.JRNXaOBY613b8.hPJonwNfRdHUAZJMm	t	2	2025-11-17 16:45:36.880222	\N
7	Distrito Capital	3	dttocapital@correo.com	$2b$10$5kRbXFlR2XpIBOa2k5ilz.JRNXaOBY613b8.hPJonwNfRdHUAZJMm	t	2	2025-11-17 18:50:02.113854	\N
6	Aragua	2	aragua@correo.com	$2b$10$5kRbXFlR2XpIBOa2k5ilz.JRNXaOBY613b8.hPJonwNfRdHUAZJMm	t	2	2025-11-17 18:49:24.710149	\N
\.


--
-- Data for Name: usuarios_estados_permitidos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_estados_permitidos (usuario_id, created_at, updated_at, estado_id) FROM stdin;
5	2025-11-17 18:27:40.830601	\N	1774
7	2025-11-28 08:31:13.420257	\N	1758
6	2025-11-28 16:29:17.693666	\N	1752
6	2025-11-28 16:29:17.693666	\N	1755
\.


--
-- Data for Name: usuarios_municipios_permitidos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_municipios_permitidos (usuario_id, created_at, updated_at, estado_id, municipio_id) FROM stdin;
\.


--
-- Data for Name: usuarios_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios_permisos (usuario_id, permiso_id, created_at, updated_at) FROM stdin;
\.


--
-- Name: auditoria_sesiones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_sesiones_id_seq', 191, true);


--
-- Name: metas_estado_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.metas_estado_id_seq', 24, true);


--
-- Name: permisos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.permisos_id_seq', 7, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 2, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 7, true);


--
-- Name: auditoria_sesiones auditoria_sesiones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_sesiones
    ADD CONSTRAINT auditoria_sesiones_pkey PRIMARY KEY (id);


--
-- Name: permisos permisos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_nombre_key UNIQUE (nombre);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id);


--
-- Name: metas_estado pk_metas_estado_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metas_estado
    ADD CONSTRAINT pk_metas_estado_id PRIMARY KEY (id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (rol_id, permiso_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios_estados_permitidos usuarios_estados_permitidos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_estados_permitidos
    ADD CONSTRAINT usuarios_estados_permitidos_pkey PRIMARY KEY (usuario_id, estado_id);


--
-- Name: usuarios_municipios_permitidos usuarios_municipios_permitidos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_municipios_permitidos
    ADD CONSTRAINT usuarios_municipios_permitidos_pkey PRIMARY KEY (usuario_id, estado_id, municipio_id);


--
-- Name: usuarios_permisos usuarios_permisos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_pkey PRIMARY KEY (usuario_id, permiso_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_auditoria_ip; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_ip ON public.auditoria_sesiones USING btree (ip_origen);


--
-- Name: idx_auditoria_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_timestamp ON public.auditoria_sesiones USING btree (timestamp_intento DESC);


--
-- Name: idx_auditoria_usuario; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auditoria_usuario ON public.auditoria_sesiones USING btree (id_usuario_fk);


--
-- Name: metas_estado trg_validar_estado; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_validar_estado BEFORE INSERT OR UPDATE ON public.metas_estado FOR EACH ROW EXECUTE FUNCTION public.validar_estado();


--
-- Name: auditoria_sesiones auditoria_sesiones_id_usuario_fk_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria_sesiones
    ADD CONSTRAINT auditoria_sesiones_id_usuario_fk_fkey FOREIGN KEY (id_usuario_fk) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: roles_permisos roles_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles_permisos
    ADD CONSTRAINT roles_permisos_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: usuarios_estados_permitidos usuarios_estados_permitidos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_estados_permitidos
    ADD CONSTRAINT usuarios_estados_permitidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios_municipios_permitidos usuarios_municipios_permitidos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_municipios_permitidos
    ADD CONSTRAINT usuarios_municipios_permitidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios_permisos usuarios_permisos_permiso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id) ON DELETE CASCADE;


--
-- Name: usuarios_permisos usuarios_permisos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios_permisos
    ADD CONSTRAINT usuarios_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id);


--
-- PostgreSQL database dump complete
--

