const express = require("express");
const ExpressError = require("../expressError");
const db = require("../db");
const slugify = require("slugify");

const router = new express.Router();

/** List all industries and their company codes */
router.get("/", async (req, res, next) => {
	try {
		const results = await db.query(`
		SELECT i.industry, c.code
		FROM companies AS c
			JOIN companies_industries AS ci
				ON c.code = ci.comp_code
			JOIN industries AS i
				ON ci.industry_code = i.code`);
		
		console.log(results.rows)

		const industries = {}
		results.rows.forEach(o => {
			if (!industries[o.industry]) industries[o.industry] = [o.code]
			else industries[o.industry].push(o.code)
		})
		return res.json({industries});
	} catch (error) {
		return next(error);
	}
});

/** Add an industry */
router.post("/", async (req, res, next) => {
	try {
		if (!req.body.industry) {
			throw new ExpressError("Must submit industry property", 400);
		}
		const { industry } = req.body;
		const code = slugify(industry, { lower: true, strict: true });
		const results = await db.query(
			`INSERT INTO industries (industry, code) 
            VALUES ($1, $2)
            RETURNING industry, code`,
			[industry, code]
		);

		return res.status(201).json({ industries: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

/** Associate a company and an industry */
router.put("/:indCode/companies/:compCode", async (req, res, next) => {
	try {
		const {indCode, compCode} = req.params

		const results = await db.query(
			`INSERT INTO companies_industries (comp_code, industry_code) 
            VALUES ($1, $2)
            RETURNING industry_code, comp_code`,
			[compCode, indCode]
		);

		return res.status(200).json({ companies_industries: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});


module.exports = router;
