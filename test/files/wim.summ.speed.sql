--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

CREATE SCHEMA wim;

SET search_path = wim, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: summaries_5min_speed; Type: TABLE; Schema: wim; Owner: slash; Tablespace:
--

CREATE TABLE summaries_5min_speed (
    site_no integer NOT NULL,
    ts timestamp without time zone NOT NULL,
    wim_lane_no integer NOT NULL,
    veh_speed numeric NOT NULL,
    veh_count integer NOT NULL
);


ALTER TABLE summaries_5min_speed OWNER TO slash;

--
-- Name: summaries_5min_speed_pkey; Type: CONSTRAINT; Schema: wim; Owner: slash; Tablespace:
--

ALTER TABLE ONLY summaries_5min_speed
    ADD CONSTRAINT summaries_5min_speed_pkey PRIMARY KEY (site_no, ts, wim_lane_no, veh_speed);


--
-- Name: wim_summaries_5min_spped_ts_idx; Type: INDEX; Schema: wim; Owner: slash; Tablespace:
--

CREATE INDEX wim_summaries_5min_spped_ts_idx ON summaries_5min_speed USING btree (ts);


--
-- Name: summaries_5min_speed_site_no_fkey; Type: FK CONSTRAINT; Schema: wim; Owner: slash
--

ALTER TABLE ONLY summaries_5min_speed
    ADD CONSTRAINT summaries_5min_speed_site_no_fkey FOREIGN KEY (site_no) REFERENCES public.wim_stations(site_no) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--
