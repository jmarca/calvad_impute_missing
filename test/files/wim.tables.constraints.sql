

--
-- Name: wim_lane_dir_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_lane_dir
    ADD CONSTRAINT wim_lane_dir_pkey PRIMARY KEY (site_no, direction, lane_no);


--
-- Name: wim_points_4269_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_points_4269
    ADD CONSTRAINT wim_points_4269_pkey PRIMARY KEY (wim_id);


--
-- Name: wim_points_4326_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_points_4326
    ADD CONSTRAINT wim_points_4326_pkey PRIMARY KEY (wim_id);


--
-- Name: wim_stations_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_stations
    ADD CONSTRAINT wim_stations_pkey PRIMARY KEY (site_no);


--
-- Name: wim_status_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_status_codes
    ADD CONSTRAINT wim_status_codes_pkey PRIMARY KEY (status);


--
-- Name: wim_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -; Tablespace:
--

ALTER TABLE ONLY wim_status
    ADD CONSTRAINT wim_status_pkey PRIMARY KEY (site_no, ts);


--
-- Name: heavy_heavy_axle; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX heavy_heavy_axle ON wim_data USING btree (axle_3_4_spacing);


--
-- Name: heavy_heavy_weight; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX heavy_heavy_weight ON wim_data USING btree (gross_weight);


--
-- Name: wim_data_ts; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX wim_data_ts ON wim_data USING btree (ts);


--
-- Name: wim_points_4326_gid_index; Type: INDEX; Schema: public; Owner: -; Tablespace:
--

CREATE INDEX wim_points_4326_gid_index ON wim_points_4326 USING btree (gid);


--
-- Name: wim_county_county_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_county
    ADD CONSTRAINT wim_county_county_id_fkey FOREIGN KEY (county_id) REFERENCES counties(id) ON DELETE CASCADE;


--
-- Name: wim_county_wim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_county
    ADD CONSTRAINT wim_county_wim_id_fkey FOREIGN KEY (wim_id) REFERENCES wim_stations(site_no) ON DELETE CASCADE;


--
-- Name: wim_district_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_district
    ADD CONSTRAINT wim_district_district_id_fkey FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE;


--
-- Name: wim_district_wim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_district
    ADD CONSTRAINT wim_district_wim_id_fkey FOREIGN KEY (wim_id) REFERENCES wim_stations(site_no) ON DELETE CASCADE;


--
-- Name: wim_freeway_freeway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_freeway
    ADD CONSTRAINT wim_freeway_freeway_id_fkey FOREIGN KEY (freeway_id) REFERENCES freeways(id) ON DELETE CASCADE;


--
-- Name: wim_freeway_wim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_freeway
    ADD CONSTRAINT wim_freeway_wim_id_fkey FOREIGN KEY (wim_id) REFERENCES wim_stations(site_no) ON DELETE CASCADE;


--
-- Name: wim_points_4269_gid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_points_4269
    ADD CONSTRAINT wim_points_4269_gid_fkey FOREIGN KEY (gid) REFERENCES geom_points_4269(gid) ON DELETE CASCADE;


--
-- Name: wim_points_4269_wim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_points_4269
    ADD CONSTRAINT wim_points_4269_wim_id_fkey FOREIGN KEY (wim_id) REFERENCES wim_stations(site_no) ON DELETE CASCADE;


--
-- Name: wim_points_4326_gid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_points_4326
    ADD CONSTRAINT wim_points_4326_gid_fkey FOREIGN KEY (gid) REFERENCES geom_points_4326(gid) ON DELETE CASCADE;


--
-- Name: wim_points_4326_wim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_points_4326
    ADD CONSTRAINT wim_points_4326_wim_id_fkey FOREIGN KEY (wim_id) REFERENCES wim_stations(site_no) ON DELETE CASCADE;


--
-- Name: wim_status_class_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_status
    ADD CONSTRAINT wim_status_class_status_fkey FOREIGN KEY (class_status) REFERENCES wim_status_codes(status) ON DELETE RESTRICT;


--
-- Name: wim_status_site_no_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_status
    ADD CONSTRAINT wim_status_site_no_fkey FOREIGN KEY (site_no) REFERENCES wim_stations(site_no) ON DELETE RESTRICT;


--
-- Name: wim_status_weight_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY wim_status
    ADD CONSTRAINT wim_status_weight_status_fkey FOREIGN KEY (weight_status) REFERENCES wim_status_codes(status) ON DELETE RESTRICT;
