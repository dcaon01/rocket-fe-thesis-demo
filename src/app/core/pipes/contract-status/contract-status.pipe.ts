import { Pipe, PipeTransform } from '@angular/core';
import { ContractStatus } from '../../enums/contract-status.enum';
import { ResellerContractStatus } from '../../enums/reseller-contract-status.enum';

/**
 * Pipe that translates the status of a contract or of a reseller contract into its label.
 */
@Pipe({
  name: 'contractStatus'
})
export class ContractStatusPipe implements PipeTransform {

  /**
   * Transforms a status value into its corresponding label.
   * @param value the status value to transform.
   * @returns the status label.
   */
  transform(value: string): string {
    let statusString = '';
    switch(value) {
      case ResellerContractStatus.Draft:
        statusString = "Bozza";
        break;
      case ResellerContractStatus.Signed:
        statusString = "Firmato";
        break;
      case ContractStatus.Active:
        statusString = "Attivo";
        break;
      case ResellerContractStatus.Suspended:
        statusString = "Sospeso";
        break;
      case ContractStatus.Terminating:
      case ResellerContractStatus.EndedAtRenewal:
        statusString = "Termina al rinnovo";
        break;
      case ContractStatus.Terminated:
      case ResellerContractStatus.Ended:
        statusString = "Terminato";
        break;
      case ResellerContractStatus.Refused:
        statusString = "Rifiutato";
        break;
      default:
        statusString = "-";
        break;
    }
    return statusString;
  }

}
