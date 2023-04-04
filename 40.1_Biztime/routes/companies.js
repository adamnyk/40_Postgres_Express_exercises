const express = require("express");
const ExpressError = require("../expressError");
const db = require("../db");
const slugify = require("slugify");

const router = new express.Router();

router.get("/", async (req, res, next) => {
	try {
		const results = await db.query(`SELECT code, name FROM companies`);

		return res.json({ companies: results.rows });
	} catch (error) {
		return next(error);
	}
});

router.get("/:code", async (req, res, next) => {
	try {
		const compResults = await db.query(
			`SELECT c.code, c.name, c.description, i.industry
            FROM companies AS c
				JOIN companies_industries AS ci
					ON c.code = ci.comp_code
				JOIN industries AS i
					ON ci.industry_code = i.code
            WHERE c.code = $1`,
			[req.params.code]
		);

		if (!compResults.rows.length) {
			throw new ExpressError(
				`Company code '${req.params.code}' not found.`,
				404
			);
		}

		const invoiceResults = await db.query(
			`SELECT id
            FROM invoices
            WHERE comp_code = $1`,
			[req.params.code]
		);

		const { code, name, description }  = compResults.rows[0];
		const industries = compResults.rows.map((c) => c.industry);
		const invoices = invoiceResults.rows.map((inv) => inv.id);
		const company = {code, name, description, industries, invoices}
		
		return res.json({ company });
		
	} catch (error) {
		return next(error);
	}
});

router.post("/", async (req, res, next) => {
	try {
		if (!req.body.name || !req.body.description) {
			throw new ExpressError("Must submit name and description", 400);
		}
		const { name, description } = req.body;
		const code = slugify(name, { lower: true, strict: true });
		const results = await db.query(
			`INSERT INTO companies (code, name, description) 
            VALUES ($1, $2, $3)
            RETURNING code, name, description`,
			[code, name, description]
		);

		return res.status(201).json({ company: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.put("/:code", async (req, res, next) => {
	try {
		const { name, description } = req.body;

		const results = await db.query(
			`UPDATE companies SET name=$1, description=$2
            WHERE code = $3
            RETURNING code, name, description`,
			[name, description, req.params.code]
		);

		if (!results.rows.length) {
			throw new ExpressError(
				`Company code '${req.params.code}' not found.`,
				404
			);
		}

		return res.json({ company: results.rows[0] });
	} catch (error) {
		return next(error);
	}
});

router.delete("/:code", async (req, res, next) => {
	try {
		const results = await db.query(
			`DELETE FROM companies 
            WHERE code =$1
            RETURNING code`,
			[req.params.code]
		);

		if (!results.rows.length) {
			throw new ExpressError(
				`Company code '${req.params.code}' not found.`,
				404
			);
		}

		return res.json({ status: "deleted" });
	} catch (error) {
		return next(error);
	}
});

module.exports = router;
