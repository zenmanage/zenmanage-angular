import { Component } from '@angular/core';
import { injectConfig } from '@zenmanage/angular';

// A type alias, not an interface: an interface has no index signature, so it isn't a JSON value.
type UiConfig = {
  theme: 'light' | 'dark';
  pageSize: number;
};

@Component({
  selector: 'example-json-flags',
  template: `<p>{{ ui.value().theme }}, {{ ui.value().pageSize }} per page</p>`,
})
export class JsonFlagsExampleComponent {
  // An object or array default makes it a JSON flag. The default is also what shows until the
  // flag has loaded, and what stays if the API can't be reached.
  readonly ui = injectConfig<UiConfig>('ui-config', { theme: 'light', pageSize: 20 });
}
