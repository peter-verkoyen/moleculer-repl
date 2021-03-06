"use strict";

const chalk 			= require("chalk");
const _ 				= require("lodash");
const { table, getBorderCharacters } 	= require("table");

module.exports = function(vorpal, broker) {
	// List services
	vorpal
		.command("services", "List of services")
		.option("-l, --local", "only local services")
		.option("-i, --skipinternal", "skip internal services")
		.option("-d, --details", "print endpoints")
		.option("-a, --all", "list all (offline) services")
		.action((args, done) => {
			const services = broker.registry.getServiceList({ onlyLocal: args.options.local, onlyAvailable: !args.options.all, skipInternal: args.options.skipinternal, withActions: true, withEvents: true });

			const data = [
				[
					chalk.bold("Service"),
					chalk.bold("Version"),
					chalk.bold("State"),
					chalk.bold("Actions"),
					chalk.bold("Events"),
					chalk.bold("Nodes")
				]
			];

			let list = [];
			let hLines = [];

			services.forEach(svc => {
				let item = list.find(o => o.name == svc.name && o.version == svc.version);
				if (item) {
					item.nodes.push({ nodeID: svc.nodeID, available: svc.available });
					if (!item.available && svc.available)
						item.available = svc.available;
				} else {
					item = _.pick(svc, ["name", "version"]);
					item.nodes = [{ nodeID: svc.nodeID, available: svc.available }];
					item.actionCount = Object.keys(svc.actions).length;
					item.eventCount = Object.keys(svc.events).length;
					item.available = svc.available;
					list.push(item);
				}
			});

			list.sort((a, b) => a.name.localeCompare(b.name));

			list.forEach(item => {
				const hasLocal = item.nodes.indexOf(broker.nodeID) !== -1;
				const nodeCount = item.nodes.length;
				
				data.push([
					item.name,
					item.version || "-",
					item.available ? chalk.bgGreen.white( "   OK   ") : chalk.bgRed.white.bold(" FAILED "),
					item.actionCount,
					item.eventCount,
					(hasLocal ? "(*) " : "") + nodeCount
				]);

				if (args.options.details && item.nodes) {
					item.nodes.forEach(({ nodeID, available }) => {
						data.push([
							"",
							"",
							available ? chalk.bgGreen.white( "   OK   ") : chalk.bgRed.white.bold(" FAILED "),
							"",
							"",
							nodeID == broker.nodeID ? chalk.gray("<local>") : nodeID,
						]);						
					});
					hLines.push(data.length);
				}
				
			});

			const tableConf = {
				border: _.mapValues(getBorderCharacters("honeywell"), char => chalk.gray(char)),
				columns: {
					1: { alignment: "right" },
					2: { alignment: "right" },
					3: { alignment: "right" },
					4: { alignment: "right" }
				},
				drawHorizontalLine: (index, count) => index == 0 || index == 1 || index == count || hLines.indexOf(index) !== -1				
			};
			
			console.log(table(data, tableConf));
			done();
		});
};