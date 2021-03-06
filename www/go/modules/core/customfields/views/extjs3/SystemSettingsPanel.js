/* global go, Ext */

/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: MainPanel.js 19225 2015-06-22 15:07:34Z wsmits $
 * @copyright Copyright Intermesh
 * @author Merijn Schering <mschering@intermesh.nl>
 */

go.modules.core.customfields.SystemSettingsPanel = Ext.extend(go.grid.GridPanel, {

	autoHeight: true,

	entity: null,
	
	title: t('Custom fields'),
	
	toolbarTitle: true,

	createFieldSetDialog: function () {
		return new go.modules.core.customfields.FieldSetDialog();
	},

	initComponent: function () {
		var title;
		if(this.toolbarTitle) {
			title = this.title;
			this.title = null;
		}

		this.plugins = [new go.grid.plugin.Sortable(this.onSort, this, this.isDropAllowed)];

		this.store = new Ext.data.ArrayStore({
			fields: [
				'name',
				'databaseName',
				'type',
				'fieldId',
				'fieldSetId',
				{name: 'isFieldSet', type: "boolean"},
				{name: 'sortOrder', type: "int"}
			]
		});

		go.Stores.get("FieldSet").on("changes", function (store, added, changed, destroyed) {
			if (this.loading || !this.rendered) {
				return;
			}
			var me = this, id, e;
			
			Ext.apply(added, changed);
			
			for(id in added) {			
				e = added[id];

				//change for another entity. Skip it.
				if(e.entity !== me.entity) {						
					return;
				}

				var record = me.store.getAt(me.store.findBy(function (record) {
					if (record.data.isFieldSet && record.data.fieldSetId === e.id) {
						return true;
					}
				}));

				if (!record) {
					me.load();
				} else
				{
					record.beginEdit();
					record.set("name", e.name);
					record.set("sortOrder", e.sortOrder);
					record.endEdit();
					record.commit();
				}
			};
			
			if(destroyed.length) {
				this.store.remove(this.store.getRange().filter(function(r) {
					return r.data.isFieldSet && destroyed.indexOf(r.data.fieldSetId) > -1;
				}));
			}
		}, this);

		go.Stores.get("Field").on("changes", function (store, added, changed, destroyed) {
			if (this.loading || !this.rendered) {
				return;
			}

			var me = this, id, e;
			
			Ext.apply(added, changed);
			
			for(id in added) {			
				e = added[id];
				if(me.store.findBy(function (record) {
					if (record.data.isFieldSet && record.data.fieldSetId === e.fieldSetId) {
						return true;
					}
				}) === -1) {
					//fieldset not part of this panel
					return;
				}

				var record = me.store.getAt(me.store.findBy(function (record) {
					if (record.data.fieldId === e.id) {
						return true;
					}
				}));

				if (!record) {
					me.load();
				} else
				{
					record.beginEdit();
					record.set("name", e.name);
					record.set("databaseName", e.databaseName);
					record.set("sortOrder", e.sortOrder);
					record.endEdit();
					record.commit();
				}
			};
			
			if(destroyed.length) {
				this.store.remove(this.store.getRange().filter(function(r) {
					return destroyed.indexOf(r.data.fieldId) > -1;
				}));
			}

		}, this);


		Ext.apply(this, {
			//plugins: [actions],
			tbar: [
				{
					xtype: "tbtitle",
					text: title
				},
				"->",
				{
					iconCls: 'ic-add',
					tooltip: t('Add field set'),
					handler: function (e, toolEl) {
						var dlg = this.createFieldSetDialog();
						dlg.setValues({entity: this.entity});
						dlg.show();
					},
					scope: this
				}
			],
			columns: [
				{
					id: 'name',
					header: t('Name'),
					width: dp(200),
					sortable: false,
					dataIndex: 'name',
					renderer: function (v, meta, record) {
						return record.data.isFieldSet ? "<h3>" + v + "</h3>" : v;
					}
				},
				{
					width: dp(80),
					menuDisabled: true,
					draggable: false,
					hidable: false,
					align: "right",
					sortable: false,
					dataIndex: "databaseName",
					renderer: function (v, meta, record) {
						if (record.data.isFieldSet) {
							return '<button class="icon" ext:qtip="' + t("Add field") + '">add</button><button class="icon">more_vert</button>';
						} else
						{
							return "<button class='icon'>more_vert</button>";
						}
					}
				}
			],
			viewConfig: {
				emptyText: '<i>description</i><p>' + t("No items to display") + '</p>',
				forceFit: true,
				autoFill: true
			},
			listeners: {
				scope: this,
				rowclick: function (grid, rowIndex, e) {
					if (e.target.tagName !== "BUTTON") {
						return false;
					}

					var record = this.store.getAt(rowIndex);

					switch (e.target.innerHTML) {
						case 'more_vert':
							this.showMoreMenu(record, e);
							break;

						case 'add':
							this.showAddFieldMenu(record, e);
							break;
					}
				}
			}
			// config options for stateful behavior
//			stateful: true,
//			stateId: 'apikeys-grid'
		});

		go.modules.core.customfields.SystemSettingsPanel.superclass.initComponent.call(this);

		this.on('render', function () {
			this.load();
		}, this);
		
		this.on('rowdblclick', this.onRowDblClick, this);
	},
	
	onRowDblClick : function(grid, rowIndex, e) {
		this.edit(this.store.getAt(rowIndex));
	},

	onSort: function (sortable, selections, dragData, dd) {
		var isFieldSet = !!selections.find(function (r) {
			if (r.data.isFieldSet) {
				return true;
			}
		});

		if (isFieldSet) {
			var fieldSetRecords = this.store.getRange().filter(function (r) {
				return r.data.isFieldSet;
			});

			var update = {};
			for (var i = 0, l = fieldSetRecords.length; i < l; i++) {
				update[fieldSetRecords[i].data.fieldSetId] = {sortOrder: i};
			}

			go.Stores.get("FieldSet").set({
				update: update
			}, function() {
				//Quick and dirty way: reload on fieldset reorder so fields are moved.
				this.load();
			}, this);
			
			
		} else
		{
			var fieldRecords = this.store.getRange().filter(function (r) {
				return !r.data.isFieldSet;
			});

			var update = {};
			for (var i = 0, l = fieldRecords.length; i < l; i++) {
				update[fieldRecords[i].data.fieldId] = {sortOrder: i};
				if (selections.column("id").indexOf(fieldRecords[i].id) > -1) {
					update[fieldRecords[i].data.fieldId].fieldSetId = dragData.dropRecord.data.fieldSetId;
				}
			}

			go.Stores.get("Field").set({
				update: update
			});
		}
	},

	isDropAllowed: function (selections, overRecord) {

		var isFieldSet = !!selections.find(function (r) {
			if (r.data.isFieldSet) {
				return true;
			}
		});

		var isField = !!selections.find(function (r) {
			if (!r.data.isFieldSet) {
				return true;
			}
		});

		//Don't allow mix
		if (isField && isFieldSet) {
			return false;
		}

		if (isFieldSet && !overRecord.data.isFieldSet) {
			//Only allow fieldsets to be dropped on other fieldsets
			return false;
		}

//		if(isField && overRecord.data.isFieldSet) {
//			return false;
//		}

		return true;
	},

	showMoreMenu: function (record, e) {
		if (!this.moreMenu) {
			this.moreMenu = new Ext.menu.Menu({
				items: [
					{
						itemId: "edit",
						iconCls: 'ic-edit',
						text: t("Edit"),
						handler: function () {
							this.edit(this.moreMenu.record);
						},
						scope: this
					}, {
						itemId: "delete",
						iconCls: 'ic-delete',
						text: t("Delete"),
						handler: function () {
							this.getSelectionModel().selectRecords([this.moreMenu.record]);
							this.deleteSelected();
						},
						scope: this
					}
				]
			});
		}

		this.moreMenu.record = record;

		this.moreMenu.showAt(e.getXY());
	},
	
	edit: function (record) {
		if (record.data.isFieldSet) {
			var dlg = this.createFieldSetDialog();
			dlg.load(record.data.fieldSetId).show();
		} else
		{
			var dlg = go.modules.core.customfields.CustomFields.getType(record.data.type).getDialog();
			dlg.load(record.data.fieldId).show();
		}
	},

	showAddFieldMenu: function (record, e) {
		if (!this.addFieldMenu) {

			var items = [], types = go.modules.core.customfields.CustomFields.getTypes();

			for (var name in types) {
				items.push({
					iconCls: types[name].iconCls,
					text: types[name].label,
					type: types[name],
					handler: function (item) {
						var dlg = item.type.getDialog();
						dlg.setValues({
							fieldSetId: this.addFieldMenu.record.data.fieldSetId,
							type: item.type.name
						});

						dlg.show();
					},
					scope: this
				});
			}

			this.addFieldMenu = new Ext.menu.Menu({
				items: items
			});
		}

		this.addFieldMenu.record = record;

		this.addFieldMenu.showAt(e.getXY());
	},

	doDelete: function (selectedRecords) {

		var fieldSetIds = [], fieldIds = [];
		selectedRecords.forEach(function (r) {
			if (r.data.isFieldSet) {
				fieldSetIds.push(r.data.fieldSetId);
			} else
			{
				fieldIds.push(r.data.fieldId);
			}
		});

		if (fieldSetIds.length) {
			go.Stores.get("FieldSet").set({
				destroy: fieldSetIds
			});
		}

		if (fieldIds.length) {
			go.Stores.get("Field").set({
				destroy: fieldIds
			});
		}
	},

	load: function () {

		this.loading = true;
		this.store.removeAll();

		var fsSortOrderMap = {};

		go.Stores.get("FieldSet").query({
			sort: ["sortOrder ASC"],
			filter: {
				entities: [this.entity]
			}
		}, function (response) {
			
			if(!response.ids.length) {
				this.store.loadData([], false);
				this.loading = false;
				return;
			}

			go.Stores.get("FieldSet").get(response.ids, function (fieldSets) {
				fieldSetsLoaded = true;

				var storeData = [], lastSortOrder = -1;
				fieldSets.forEach(function (fs) {
					if(!fs.sortOrder) {
						fs.sortOrder = lastSortOrder + 1;
					} 
					lastSortOrder = fs.sortOrder;
					storeData.push([
						fs.name,
						null,
						null,
						null,
						fs.id,
						true,
						fs.sortOrder * 100000
					]);

					fsSortOrderMap[fs.id] = fs.sortOrder * 100000;

				});



				this.store.loadData(storeData, true);

			}, this);

			go.Stores.get("Field").query({
				sort: ["sortOrder ASC"],
				filter: {
					fieldSetId: response.ids
				}
			}, function (response) {
				go.Stores.get("Field").get(response.ids, function (fields) {
					var storeData = [], lastSortOrder = -1;
					fields.forEach(function (f) {
						if(!f.sortOrder) {
							f.sortOrder = lastSortOrder + 1;
						} 
						lastSortOrder = f.sortOrder;
						storeData.push([
							f.name,
							f.dataName,
							f.type,
							f.id,
							f.fieldSetId,
							false,
							f.sortOrder + fsSortOrderMap[f.fieldSetId]
						]);
					});

					this.store.loadData(storeData, true);

					this.store.multiSort([
//						//{field: 'fieldSetId', direction: 'ASC'},
//						{field: 'isFieldSet', direction: 'DESC'},
						{field: 'sortOrder', direction: 'ASC'}
					]);
					this.loading = false;
				}, this);
			}, this);

		}, this);



	}
});



