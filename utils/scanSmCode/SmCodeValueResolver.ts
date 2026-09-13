import { SmCodeMapper } from "./SmCodeMapper";
import type { ConvertReferencable, IndexReferencable, IndexReference } from "./types";

export class SmCodeValueResolver extends SmCodeMapper<true> {
  private isSkippableReference(id: string, reference: IndexReferencable<false>) {
    return !this.roots.has(id) && reference.references.filter((id2) => id2 !== id).length <= 1;
  }

  protected mapReference<T extends IndexReferencable<false>>(
    value: IndexReference<false, T>,
  ): IndexReference<true, ConvertReferencable<false, true, T>> {
    const resolved = this.resolveReference<T>(value);
    if (this.isSkippableReference(value.id, resolved)) {
      return this.mapReferencable(resolved);
    }

    return super.mapReference(value);
  }

  protected mapIndexedReference(id: string, object: IndexReferencable<false>) {
    return this.isSkippableReference(id, object) ? undefined : super.mapIndexedReference(id, object);
  }
}
