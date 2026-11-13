import { Pipe, PipeTransform } from '@angular/core';
import { TypeEnum } from '../../enums/type.enum';

@Pipe({
  name: 'type'
})
export class TypePipe implements PipeTransform {

  /**
   * Transforms a type enum value into its corresponding label.
   * @param value type enum value to transform.
   * @returns the label value.
   */
  transform(value: string): string {
    let typeString = '';
    switch (value) {
      case TypeEnum.String:
        typeString = 'String';
        break;
      case TypeEnum.Number:
        typeString = 'Number';
        break;
      case TypeEnum.Boolean:
        typeString = 'Boolean';
        break;
      case TypeEnum.Object:
        typeString = 'Object';
        break;
      default:
        typeString = '-';
        break;
    }
    return typeString;
  }

}
