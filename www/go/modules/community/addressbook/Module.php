<?php
namespace go\modules\community\addressbook;

use go\core\module\Base;
use go\modules\community\addressbook\model\Contact;
use go\modules\core\links\model\Link;
							
/**						
 * @copyright (c) 2018, Intermesh BV http://www.intermesh.nl
 * @author Merijn Schering <mschering@intermesh.nl>
 * @license http://www.gnu.org/licenses/agpl-3.0.html AGPLv3
 * 
 * @todo 
 * filters
 * Merge
 * Batch edit
 * Export
 * Import
 * Carddav
 * Document templates
 * ActiveSync
 * Migration
 * Send newsletter
 * 
 * 
 * 
 */
class Module extends Base {
							
	public function getAuthor() {
		return "Intermesh BV <info@intermesh.nl>";
	}

	
	public function defineListeners() {
		parent::defineListeners();
		
		Link::on(Link::EVENT_DELETE, Contact::class, 'onLinkSaveOrDelete');
		Link::on(Link::EVENT_SAVE, Contact::class, 'onLinkSaveOrDelete');
		
	}
							
}