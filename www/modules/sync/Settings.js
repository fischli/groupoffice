/** 
 * Copyright Intermesh
 * 
 * This file is part of Group-Office. You should have received a copy of the
 * Group-Office license along with Group-Office. See the file /LICENSE.TXT
 * 
 * If you have questions write an e-mail to info@intermesh.nl
 * 
 * @version $Id: Settings.js 23425 2018-02-13 09:48:05Z mschering $
 * @copyright Copyright Intermesh
 * @author Michael de Hart <mdhart@intermesh.nl>
 */
GO.sync.SettingsPanel = Ext.extend(Ext.Panel,{
	
	autoScroll:true,
	title : t("Synchronization", "sync"),
	iconCls: 'ic-sync',
	defaultType: 'textfield',
	
	onLoadStart: function (userId) {
		
		//temporary fix for combo to show address book name. Remove when refactored
		var userGetRequest = go.Jmap.findRequestByMethod("User/get");
		if(!userGetRequest) {
			return;
		}
		var userGetRequestId = userGetRequest[2];
		go.Jmap.request({
			method: "community/email/Account/get",
			params: {
				"properties": ["username"],
				"#ids": {
						"resultOf": userGetRequestId,
						"name": "User/get",
						"path": "/list/*/syncSettings/account_id"
				}
			},
			callback: function(options, success, result) {
				if(result.list[0]) {
					this.selectAccount.setRemoteText(result.list[0].username);
				}
			},
			scope: this
		});
	},
	
	initComponent: function() {
		
		this.items = [new Ext.form.FieldSet({
			title:'E-mail',
			labelWidth: 170,
			items: [
				this.selectAccount = new GO.form.ComboBox({
					fieldLabel: t("E-mail Account", "email"),
					hidden: (!GO.settings.modules.email || !GO.settings.modules.email.read_permission),
					hiddenName:'syncSettings.account_id',
					anchor:'-20',
					emptyText:t("Please select..."),
					store: new GO.data.JsonStore({
						url: GO.url("email/account/store"),
						fields: ['id', 'username'],
						remoteSort: true
					}),
					valueField:'id',
					displayField:'username',
					typeAhead: true,
					mode: 'remote',
					triggerAction: 'all',
					editable: false,
					selectOnFocus:true,
					forceSelection: true
				})
			]})
		];

		var syncComponents = {calendar: 'Calendar',addressbook: 'Addressbook',tasks: 'Tasklist'};
		
		for(var i in syncComponents) {
			var module = i,
				name = syncComponents[i],
				id = name.toLowerCase();			
			
			if(go.Modules.isAvailable("legacy", module))
			{
				var defaultCol = new GO.grid.RadioColumn({
					header: t("Default", "sync"),
					dataIndex: 'default_'+id,
					width: 90,
					isDisabled:function(record){
						return record.get('permission_level')<GO.permissionLevels.writeAndDelete;
					}
				});

				this['panel'+name] = new GO.base.model.multiselect.panel({

					autoLoadStore: false,
					deleteDefaultCol: 'default_'+id,
					deleteSelected : this.checkDefaultSelected,
					autoHeight:true,
					paging: false,
					autoExpandColumn:'name',
					url:'sync/user'+name,
					columns:[{
							header: t("Name"), 
							dataIndex: 'name', 
							sortable: true,
							id:'name'
						},
						defaultCol
					],
					plugins: [defaultCol],
					selectColumns:[{
						header: t("Name"), 
						dataIndex: 'name', 
						sortable: true
					}],
					fields:['id','name','default_'+id,'permission_level'],
					model_id:GO.settings.user_id,
					title: t("name", module)					
				});
//				this['panel'+name].getTopToolbar().insert(0,"->");
//				this['panel'+name].getTopToolbar().insert(0,t("name", module));
				
				this.items.push(this['panel'+name]);
			}
		}


		if(go.Modules.isAvailable("legacy", module))
		{
			var defaultCol = new GO.grid.RadioColumn({
					header: t("Default", "sync"),
					dataIndex: 'isDefault',
					width: dp(104)
				});
				
			this.items.push(this.noteBookSelect = new go.form.multiselect.Field({
				name: "syncNoteBooks",
				idField: "noteBookId",
				displayField: "name",
				entityStore: go.Stores.get("NoteBook"),
				title: t("Notebooks", "notes"),
				extraColumns: [defaultCol],
				extraFields: [{name: "isDefault", type: "boolean"}],
				plugins: [defaultCol],
			}));
		}
	
		this.on('show',function(){
			if(this.panelAddressbook)
				this.panelAddressbook.store.load();

			if(this.panelTasklist)
				this.panelTasklist.store.load();

			if(this.panelCalendar)
				this.panelCalendar.store.load();

			//if(this.panelNoteCategories)
				//this.panelNoteCategories.store.load();

			if(this.devicesGrid)
				this.devicesGrid.store.load()
		},this);
		
		GO.sync.SettingsPanel.superclass.initComponent.call(this);
	},
	
	onLoadComplete : function(user) {
	
//		if(this.noteBookSelect) {
//			
//			this.noteBookSelect.setRecords(user.syncNoteBooks);
//		}
		
	},
	
	checkDefaultSelected : function(){
		var defaultFound = false,
			records = this.selModel.getSelections();
		for (var i=0;i<this.selModel.selections.keys.length;i++) {
			if(records[i].data[this.deleteDefaultCol] == 1 && !defaultFound){
				defaultFound = true;
				break;
			}
		}

		if(!defaultFound){
			return GO.base.model.multiselect.panel.superclass.deleteSelected.call(this);
		}
		alert(t("Can't delete the default item."));
	}

});			

go.Modules.register("legacy", 'sync', {
	userSettingsPanels: ["GO.sync.SettingsPanel"]
});	

