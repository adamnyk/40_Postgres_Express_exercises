/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
	constructor({ id, firstName, lastName, phone, notes }) {
		this.id = id;
		this.firstName = firstName;
		this.lastName = lastName;

		this.phone = phone;
		this.notes = notes;
	}

	/** find all customers. */

	static async all() {
		const results = await db.query(
			`SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
		);
		return results.rows.map((c) => new Customer(c));
	}

	/** returns full name */
	get fullName() {
		return `${this.firstName} ${this.lastName}`;
	}

	set notes(val) {
		this._notes =  val || ""
	}
	get notes() {
		return this._notes
	}

	/** get a customer by ID. */

	static async get(id) {
		const results = await db.query(
			`SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
			[id]
		);

		const customer = results.rows[0];

		if (customer === undefined) {
			const err = new Error(`No such customer: ${id}`);
			err.status = 404;
			throw err;
		}

		return new Customer(customer);
	}

	/** get all reservations for this customer. */

	async getReservations() {
		return await Reservation.getReservationsForCustomer(this.id);
	}

	/** search for customer and return ids */
	static async search(query) {
		const ilikeQuery = "%"+query.replaceAll(" ", "%")+"%"

		const result = await db.query(
			`SELECT id, 
			first_name AS "firstName",  
			last_name AS "lastName", 
			phone, 
			notes 
			FROM customers
			WHERE concat(first_name,' ',last_name) ILIKE $1
			ORDER BY last_name, first_name`,
			[ilikeQuery]
		)

		return result.rows.map(c=> new Customer(c))
	}

	/** get the 10 customers with the most reservations */
	static async getBest() {
		const result = await db.query(
			`SELECT  c.id, 
			c.first_name AS "firstName", 
			c.last_name AS "lastName",
			c.phone, 
			c.notes,
			count(r.id) 
			FROM customers AS c                           
			JOIN reservations AS r
				ON c.id = r.customer_id 
			GROUP BY c.id, c.first_name, c.last_name, c.last_name, c.phone, c.notes
			ORDER BY count(r.id) desc 
			LIMIT 10`
		)

		return result.rows.map(c => {
			const {count, ...customer} = c
			const topCustomer = new Customer(customer)
			topCustomer.count = count
			return topCustomer
		})
	}

	/** save this customer. */

	async save() {
		if (this.id === undefined) {
			const result = await db.query(
				`INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
				[this.firstName, this.lastName, this.phone, this.notes]
			);
			this.id = result.rows[0].id;
		} else {
			await db.query(
				`UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
				[this.firstName, this.lastName, this.phone, this.notes, this.id]
			);
		}
	}


}

module.exports = Customer;
